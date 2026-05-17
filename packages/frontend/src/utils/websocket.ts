import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/';
const path = import.meta.env.VITE_API_URL ? '/websocket' : '/api/websocket';

const socket: Socket = io(URL, {
    path,
    transports: ['websocket', 'polling']
});

const joinedRooms = new Map<string, number>();

socket.on('connect', () => {
    console.log('WebSocket connected', socket.id);
    for (const room of joinedRooms.keys()) {
        socket.emit('join', room);
    }
});

socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
});

export const joinRoom = (room: string) => {
    const currentCount = joinedRooms.get(room) || 0;
    joinedRooms.set(room, currentCount + 1);
    if (currentCount === 0 && socket.connected) socket.emit('join', room);
};

export const leaveRoom = (room: string) => {
    const currentCount = joinedRooms.get(room) || 0;
    if (currentCount <= 1) {
        joinedRooms.delete(room);
        if (socket.connected) socket.emit('leave', room);
        return;
    }

    joinedRooms.set(room, currentCount - 1);
};

export default {
    getInstance() {
        return socket;
    },
    leaveRoom,
    joinRoom
};
