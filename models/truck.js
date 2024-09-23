
const mongoose = require('mongoose')

const truckSchema = new mongoose.Schema({
    ownerImage:{type:String },
    ownerAdharCard:{type:String , required:true},
    ownerDrivingLicense:{type:String , required:true},
    vehicleImages: [{ type: String, required: true }], 
    vehicleInsurance:{type:String , required:true},
    vehicleRC:{type:String , required:true},
    vehicleMake:{type:String},
    vehicleModel:{type:String},
    licensePlate: { type: String, required: true }, 
    vehicleColor:{type:String },
    ton:{type:String},
    size:{type:String},
    // numberOfSeats:{type:String, required:true},
    // milage:{type:String },
    vehicleApprovedByAdmin :{type:String,enum: ['pending', 'approved', 'rejected'],default:'pending'},
    adminCommissionAmount:{type:String},
    advanceAmount :{type:String},
    totalEarnings:{type:String },
    noOfBookings:{type:Number},
    categoryType:{type:String,default:'goods', required:true},
    subCategory:{type:String,default:'truck'},
    rejectedReson:{type:String},
    vehicleAvailable:{type:String,default:'no'}
})

module.exports = truckSchema