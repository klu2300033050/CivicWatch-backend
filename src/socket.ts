import { Server } from "socket.io";
import http from "http";

let io: Server;

export const initSocket = (server: http.Server): Server => {
    io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        // Client joins personal room after auth
        socket.on("join", (userId: string) => {
            socket.join(`user_${userId}`);
            console.log(`Socket ${socket.id} joined room user_${userId}`);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    return io;
};

export { io };
