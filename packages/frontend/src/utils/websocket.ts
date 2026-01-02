import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/api';
const path = '/websocket';

const socket: Socket = io(URL, {
    path,
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('WebSocket connected', socket.id);
});

socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
});

export const joinRoom = (room: string) => {
    if (socket.connected) {
        socket.emit('join', room);
    } else {
        socket.once('connect', () => {
            socket.emit('join', room);
        });
    }
};

export const leaveRoom = (room: string) => {
    if (socket.connected) {
        socket.emit('leave', room);
    }
};

export default {
    getInstance() {
        return socket;
    },
    leaveRoom,
    joinRoom
};
