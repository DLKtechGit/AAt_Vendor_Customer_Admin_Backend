
const mongoose = require('mongoose')

const vanSchema = new mongoose.Schema({
    ownerImage:[{type:String }],
    ownerAdharCard:[{type:String , required:true}],
    ownerDrivingLicense:[{type:String , required:true}],
    vehicleImages: [{ type: String, required: true }], 
    vehicleInsurance:[{type:String , required:true}],
    vehicleRC:[{type:String , required:true}],
    vehicleMake:{type:String},
    vehicleModel:{type:String},
    licensePlate: { type: String, required: true }, 
    vehicleColor:{type:String },
    numberOfSeats:{type:String, required:true},
    milage:{type:String },
    vehicleApprovedByAdmin :{type:String,enum: ['pending', 'approved', 'rejected'],default:'pending'},
    advanceAmount :{type:String},
    noOfBookings:{type:Number}, 
    categoryType:{type:String,default:'Passengers', required:true},
    subCategory:{type:String,default:'van'},
    rejectedReson:{type:String},
    vehicleAvailable:{type:String,default:'no'},
    pickupDate : {type:Date},
    returnDate : {type:Date},
    adminCommissionPercentage:{type:Number},
    tripStartedAt:{type:Date},
    pricePerDay:{type:String},
    pricePerKm:{type:String},
    fuelType:{type:String}
})

module.exports = vanSchema