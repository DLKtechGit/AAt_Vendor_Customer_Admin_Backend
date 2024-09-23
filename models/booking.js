const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({

    pickupLocation:{type:String,required:true},
    dropLocation : {type:String,required:true},
    pickupDate:{type:Date},
    returnDate:{type:Date},
    totalKm:{type:String},
    advanceAmount:{type:Number},
    totalFare:{type:Number},
    remainingPayment:{type:String},
    vendorApprovedStatus:{type:String,default:"pending"},
    vendorRejectedReason:{type:String},
    paymentMethod:{type:String},
    tripStatus:{type:String},
    tripType:{type:String},
    customerCancelled:{type:Boolean , default:false},
    customerCancelledReason:{type:String},
    // vendordetails:[],
    customer:{},
    vehicleDetails:{},
    bookedAt:{type:Date,default: Date.now},
    vendorTotalPayment:{type:Number},
    adminCommissionAmount:{type:Number},
    completedAt:{type:Date}
    

 
  

})

const bookingModel = mongoose.model('bookings',bookingSchema)

module.exports = bookingModel