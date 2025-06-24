import type {
    ConsumerSensorDriver,
    ConnectionStatus,
    SensorFrame,
    SensorStream,
    FrameCallback,
    StreamUpdateCallback,
    StatusChangeCallback,
    UnsubscribeFn
} from "../types/index.js";

export interface WebRTCConsumerConfig {
    type: "webrtc-consumer";
    signalingUrl: string; // ws://host:port/signaling
    streamId?: string;
}

export class WebRTCConsumer implements ConsumerSensorDriver {
    readonly type = "consumer" as const;
    readonly id: string;
    readonly name = "WebRTC Consumer";

    private config: WebRTCConsumerConfig;
    private _status: ConnectionStatus = { isConnected: false };

    private pc: RTCPeerConnection | null = null;
    private dc: RTCDataChannel | null = null;
    private signaling?: WebSocket;

    private frameSentCallbacks: FrameCallback[] = [];
    private streamUpdateCallbacks: StreamUpdateCallback[] = [];
    private statusCallbacks: StatusChangeCallback[] = [];

    private activeStreams = new Map<string, SensorStream>();
    private sendQueue: SensorFrame[] = [];
    private isSending = false;

    private readonly BUFFER_WATERMARK = 4 * 1024 * 1024; // 4 MB

    constructor(config: WebRTCConsumerConfig) {
        this.config = config;
        this.id = `webrtc-consumer-${Date.now()}`;
    }

    get status(): ConnectionStatus {
        return this._status;
    }

    async connect(): Promise<void> {
        // open signaling
        this.signaling = new WebSocket(this.config.signalingUrl);
        await new Promise<void>((res, rej) => {
            this.signaling!.onopen = () => res();
            this.signaling!.onerror = rej;
        });

        // create pc
        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // datachannel
        this.dc = this.pc.createDataChannel("video", {
            ordered: false,
            maxRetransmits: 0
        });
        this.dc.binaryType = "arraybuffer";
        this.dc.onopen = () => {
            this._status = { isConnected: true, lastConnected: new Date() };
            this.notifyStatus();
            this.flushQueue();
        };
        this.dc.onclose = () => {
            this._status = { isConnected: false, error: "DC closed" };
            this.notifyStatus();
        };

        // ICE - Trickle-ICE for faster startup
        this.pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                this.signaling!.send(JSON.stringify({ 
                    type: "ice", 
                    candidate: ev.candidate.toJSON() 
                }));
            } else {
                // Send end-of-candidates marker
                this.signaling!.send(JSON.stringify({ 
                    type: "ice", 
                    candidate: { end: true } 
                }));
            }
        };

        // signaling messages
        this.signaling.onmessage = async (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.type === "answer") {
                await this.pc!.setRemoteDescription({ type: "answer", sdp: msg.sdp });
            } else if (msg.type === "ice") {
                // Handle end-of-candidates marker
                if (msg.candidate?.end) {
                    // ICE gathering complete on remote side
                    return;
                }
                await this.pc!.addIceCandidate(msg.candidate);
            }
        };

        // create offer immediately (trickle-ICE)
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.signaling.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
    }

    async disconnect(): Promise<void> {
        if (this.dc) this.dc.close();
        if (this.pc) this.pc.close();
        if (this.signaling) this.signaling.close();
        this._status = { isConnected: false };
        this.notifyStatus();
    }

    // ConsumerSensorDriver impl
    async sendFrame(frame: SensorFrame): Promise<void> {
        if (!this.dc || this.dc.readyState !== "open") {
            throw new Error("DataChannel not open");
        }
        this.sendQueue.push(frame);
        this.flushQueue();
    }

    async sendFrames(frames: SensorFrame[]): Promise<void> {
        this.sendQueue.push(...frames);
        this.flushQueue();
    }

    async startOutputStream(stream: SensorStream): Promise<void> {
        this.activeStreams.set(stream.id, stream);
        this.notifyStream(stream);
    }
    async stopOutputStream(streamId: string): Promise<void> {
        const s = this.activeStreams.get(streamId);
        if (s) {
            s.active = false; this.activeStreams.delete(streamId); this.notifyStream(s);
        }
    }
    getActiveOutputStreams(): SensorStream[] { return Array.from(this.activeStreams.values()); }

    // no-op for onFrameSent etc.
    onFrameSent(cb: FrameCallback): UnsubscribeFn { this.frameSentCallbacks.push(cb); return () => this.pull(this.frameSentCallbacks, cb); }
    onStreamUpdate(cb: StreamUpdateCallback): UnsubscribeFn { this.streamUpdateCallbacks.push(cb); return () => this.pull(this.streamUpdateCallbacks, cb); }
    onStatusChange(cb: StatusChangeCallback): UnsubscribeFn { this.statusCallbacks.push(cb); return () => this.pull(this.statusCallbacks, cb); }

    // helpers
    private flushQueue() {
        if (!this.dc || this.dc.readyState !== "open") return;
        while (this.sendQueue.length && this.dc.bufferedAmount < this.BUFFER_WATERMARK) {
            const frame = this.sendQueue.shift()!;
            const packet = this.frameToPacket(frame);
            this.dc.send(packet);
            this.frameSentCallbacks.forEach((c) => c(frame));
        }
    }

    private frameToPacket(frame: SensorFrame): ArrayBuffer {
        const headerObj = {
            type: "video_frame",
            timestamp: frame.timestamp,
            frameType: frame.type,
            metadata: frame.metadata,
            streamId: this.config.streamId
        };
        const headerJson = JSON.stringify(headerObj);
        const headerBuf = new TextEncoder().encode(headerJson);
        const lenBuf = new Uint32Array([headerBuf.length]).buffer;
        let dataBuf: ArrayBuffer;
        if (frame.data instanceof Blob) {
            // this is sync because MediaRecorder gives Blob slices pre-gathered
            // but we need async arrayBuffer — already spec returns Promise
            return frame.data.arrayBuffer().then((buf) => {
                const out = new Uint8Array(lenBuf.byteLength + headerBuf.length + buf.byteLength);
                out.set(new Uint8Array(lenBuf), 0);
                out.set(headerBuf, lenBuf.byteLength);
                out.set(new Uint8Array(buf), lenBuf.byteLength + headerBuf.length);
                return out.buffer;
            }) as unknown as ArrayBuffer; // caller handles async in flushQueue loop by awaiting? For now assume ArrayBuffer path (MediaRecorder provides ArrayBuffer in config)
        } else {
            dataBuf = frame.data as ArrayBuffer;
        }
        const out = new Uint8Array(lenBuf.byteLength + headerBuf.length + dataBuf.byteLength);
        out.set(new Uint8Array(lenBuf), 0);
        out.set(headerBuf, lenBuf.byteLength);
        out.set(new Uint8Array(dataBuf), lenBuf.byteLength + headerBuf.length);
        return out.buffer;
    }

    private pull<T>(arr: T[], item: T) { const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); }
    private notifyStream(s: SensorStream) { this.streamUpdateCallbacks.forEach((c) => c(s)); }
    private notifyStatus() { this.statusCallbacks.forEach((c) => c(this._status)); }
} 