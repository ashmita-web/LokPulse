import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;


// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);

            // Let Socket.IO handle its own requests
            if (parsedUrl.pathname?.startsWith("/api/socket/io")) {
                return;
            }

            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        path: "/api/socket/io", // Custom path to avoid interfering with Next.js routes
        addTrailingSlash: false,
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Attach io to global object for API routes to access
    (global as any).io = io;

    io.on("connection", (socket) => {
        // console.log("New client connected:", socket.id);

        socket.on("join-poll", (pollId: string) => {
            socket.join(pollId);

            // Broadcast new viewer count
            const room = io.sockets.adapter.rooms.get(pollId);
            const count = room ? room.size : 0;
            io.to(pollId).emit("viewer-count-update", count);
            // console.log(`Socket ${socket.id} joined ${pollId}. Count: ${count}`);
        });

        socket.on("disconnecting", () => {
            // Iterate over all rooms the socket is currently in
            const rooms = Array.from(socket.rooms);
            for (const room of rooms) {
                if (room !== socket.id) {
                    // Get current count before leave
                    const roomSet = io.sockets.adapter.rooms.get(room);
                    const currentCount = roomSet ? roomSet.size : 0;
                    // The user is leaving, so new count is current - 1
                    const newCount = Math.max(0, currentCount - 1);

                    // Broadcast to everyone else in the room
                    socket.to(room).emit("viewer-count-update", newCount);
                }
            }
        });

        socket.on("disconnect", () => {
            // standard disconnect
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.io server running at path: /api/socket/io`);
    });
});
