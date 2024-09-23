const mongoose = require('mongoose')

const autoSchema = new mongoose.Schema({
    ownerImage:{type:String },
    ownerAdharCard:{type:String , required:true},
    ownerDrivingLicense:{type:String , required:true},
    vehicleImages: [{ type: String, required: true }], 
    vehicleInsurance:{type:String , required:true},
    vehicleRC:{type:String , required:true},
    // vehicleMake:{type:String,required:true},
    vehicleModel:{type:String,required:true},
    licensePlate: { type: String, required: true }, 
    // vehicleColor:{type:String, required:true},
    numberOfSeats:{type:String, required:true},
    // milage:{type:String , required:true},
    vehicleApprovedByAdmin :{type:String,enum: ['pending', 'approved', 'rejected'],default:'pending'},
    adminCommissionAmount:{type:String},
    // advanceAmount :{type:String},
    totalEarnings:{type:String  },
    noOfBookings:{type:Number},
    categoryType:{type:String,default:'Passengers', required:true},
    subCategory:{type:String,default:'auto'},
    rejectedReson:{type:String},
    vehicleAvailable:{type:String,default:'no'}
})

module.exports = autoSchema