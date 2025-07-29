"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomJuliaBridge = void 0;
const net = __importStar(require("net"));
const uuid_1 = require("uuid");
class CustomJuliaBridge {
    constructor({ host = '127.0.0.1', port = 8052 } = {}) {
        this.client = null;
        this.responses = new Map();
        this.host = host;
        this.port = port;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.client = net.createConnection({ host: this.host, port: this.port }, () => {
                console.log('[CustomJuliaBridge] Connected to Julia server.');
                resolve();
            });
            this.client.on('data', (data) => {
                const responses = data.toString().split('\n').filter(s => s);
                responses.forEach(responseStr => {
                    const response = JSON.parse(responseStr);
                    if (this.responses.has(response.id)) {
                        const callback = this.responses.get(response.id);
                        callback(response);
                        this.responses.delete(response.id);
                    }
                });
            });
            this.client.on('end', () => {
                console.log('[CustomJuliaBridge] Disconnected from Julia server.');
            });
            this.client.on('error', (err) => {
                console.error('[CustomJuliaBridge] Connection error:', err);
                reject(err);
            });
        });
    }
    async disconnect() {
        return new Promise((resolve) => {
            if (this.client) {
                this.client.end(() => resolve());
            }
        });
    }
    runCommand(command, params = {}, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                return reject(new Error('Not connected to Julia server.'));
            }
            const id = (0, uuid_1.v4)();
            const request = {
                jsonrpc: '2.0',
                command: command,
                params: params,
                id: id,
            };
            const timer = setTimeout(() => {
                this.responses.delete(id);
                reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);
            this.responses.set(id, (response) => {
                clearTimeout(timer);
                if (response.error) {
                    reject(new Error(`Julia Error: ${response.error.message}`));
                }
                else {
                    resolve(response.result);
                }
            });
            this.client.write(JSON.stringify(request) + '\n');
        });
    }
}
exports.CustomJuliaBridge = CustomJuliaBridge;
//# sourceMappingURL=CustomJuliaBridge.js.map