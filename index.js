const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoures');
const path = require('path');
const http = require('http');  
const bodyParser = require('body-parser');

const socketIo = require('socket.io');
const {customerMessage , customerChat} = require('./models/chatandMessageForCustomer');
const { vendorMessage, vendorChat } = require('./models/chatAndMessageForVendor');


dotenv.config();

const app = express();
const server = http.createServer(app);  
const io = socketIo(server);  

app.use(express.json());

const corsOptions = {
    origin: process.env.baseURL || 'http://localhost:4000',  
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
}; 

app.use(cors(corsOptions));
app.use(bodyParser.json()); 

    
mongoose.connect(`${process.env.dbUrl}/${process.env.dbName}`)
    .then(() => console.log("MongoDB Connected"))
    .catch(error => console.log("Error connecting to MongoDB:", error));

app.use('/customer', customerRoutes);
app.use('/vendor', vendorRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Hello root node');
});

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', ({ chatId }) => {
        socket.join(chatId);
        console.log(`User joined chat room: ${chatId}`);
    });

    socket.on('sendMessage', async ({ chatId, senderId, receiverId, content, senderModel, receiverModel }) => {
        try {
            const message = new customerMessage({
                sender: senderId,
                receiver: receiverId,
                content,
                senderModel, 
                receiverModel
            });

            await message.save();

            const chat = await customerChat.findById(chatId);
            chat.messages.push(message._id);
            chat.lastUpdated = new Date();
            await chat.save();

            io.to(chatId).emit('receiveMessage', message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    socket.on('joinVendorRoom', ({ chatId }) => {
        socket.join(chatId);
        console.log(`User joined chat room: ${chatId}`);
    });

    socket.on('sendVendorMessage', async ({ chatId, senderId, receiverId, content, senderModel, receiverModel }) => {
        try {
            const message = new vendorMessage({
                sender: senderId,
                receiver: receiverId,
                content,
                senderModel, 
                receiverModel
            });
 
            await message.save();

            const chat = await vendorChat.findById(chatId);
            chat.messages.push(message._id);
            chat.lastUpdated = new Date();
            await chat.save();

            io.to(chatId).emit('receiveMessage', message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });



 


    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
 
const PORT = process.env.PORT;

server.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
