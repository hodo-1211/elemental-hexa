// 터미널에서 npm install express socket.io 실행 필요
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(__dirname));

let waitingPlayer = null; // 대기 중인 유저
let roomCount = 0;

io.on('connection', (socket) => {
    console.log('유저 접속:', socket.id);

    // 1. 매칭 요청 감지
    if (!waitingPlayer) {
        // 대기자가 없으면 대기 상태로 등록
        waitingPlayer = socket;
        socket.emit('waiting', '상대방을 기다리는 중입니다...');
    } else {
        // 대기자가 있으면 2명 매칭 완료!
        roomCount++;
        const roomId = `room_${roomCount}`;
        const player1 = waitingPlayer;
        const player2 = socket;
        waitingPlayer = null;

        player1.join(roomId);
        player2.join(roomId);

        // 각각 백(White), 흑(Black) 역할 부여 후 게임 시작 통보
        player1.emit('gameStart', { role: 'w', roomId });
        player2.emit('gameStart', { role: 'b', roomId });

        console.log(`[${roomId}] 게임 시작! (White: ${player1.id}, Black: ${player2.id})`);
    }

    // 2. 한 유저가 기물을 움직였을 때 상대방에게 전달
    socket.on('makeMove', (data) => {
        // data: { roomId, moveData }
        socket.to(data.roomId).emit('opponentMove', data.moveData);
    });

    // 3. 접속 해제 처리
    socket.on('disconnect', () => {
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        io.emit('playerLeft');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 게임 서버 실행 중: http://localhost:${PORT}`);
});
