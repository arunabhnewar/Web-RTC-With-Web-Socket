// Dependencies
const express = require('express');
const app = express();
const { v4: uuid } = require('uuid');
const socketIO = require('socket.io');
const http = require('http');
const expressHTTPServer = http.createServer(app);
const io = new socketIO.Server(expressHTTPServer);



// initialization
app.use(express.static('public'));
app.set('view engine', 'ejs');



app.get('/', (req, res) => {
    res.redirect(`/${uuid()}`)
})



app.get('/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    res.render('index', {
        roomId
    })
})



io.on('connection', (socket) => { 

    // Join A New Room 
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);


        // Notification About New Joining To Active Users
        socket.to(roomId).emit('newJoined')
    })


    // Send Offer 
    socket.on('sendOffer', (offer, roomId) => {
        socket.to(roomId).emit('receiveOffer', offer)
    })


    // Send Answer 
    socket.on('sendAnswer', (answer, roomId) => {
        socket.to(roomId).emit('receiveAnswer', answer)
    })


    // Send Ice Candidate
    socket.on('iceCandidateSend', (candidate, roomId) => {
        socket.to(roomId).emit('iceCandidateReceive', candidate)
    })


    // Disconnect Event
    socket.on('disconnect', () => {
        io.emit('someoneLeft', socket.id)
    })
})



// Server listening
expressHTTPServer.listen(process.env.PORT || 3000, () => {
    console.log("Server has been fucked up on port 3000");
})