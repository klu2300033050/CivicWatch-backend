"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initSocket = (server) => {
    exports.io = io = new socket_io_1.Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);
        // Client joins personal room after auth
        socket.on("join", (userId) => {
            socket.join(`user_${userId}`);
            console.log(`Socket ${socket.id} joined room user_${userId}`);
        });
        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });
    return io;
};
exports.initSocket = initSocket;
