const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes')
const vendorRoutes = require("./routes/vendorRoures")
const path = require('path')


dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());

mongoose.connect(`${process.env.dbUrl}/${process.env.dbName}`)
    .then(() => console.log("MongoDB Connected"))
    .catch(error => console.log("Error connecting to MongoDB:", error));

app.use('/customer', customerRoutes);
app.use('/vendor',vendorRoutes)
app.use('/admin',adminRoutes)
 
app.get('/', (req, res) => {
    res.send('Hello root node');
});

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
 

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
