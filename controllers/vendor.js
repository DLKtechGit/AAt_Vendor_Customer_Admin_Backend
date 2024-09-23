const auth = require("../middleware/auth");
const vendorModel = require("../models/vendor");
const nodemailer = require("nodemailer");
const upload = require('../middleware/uploadMiddleware')
const crypto = require("crypto");
const mongoose = require('mongoose');
const bookingModel = require("../models/booking");
const customerModel = require("../models/customer");
const adminModel = require("../models/admin");

// const registerVendorWithCar = async (req, res) => {
//   const { userName, email, password, cars } = req.body;

//   if (!userName || !email || !password || !cars) {
//     return res.status(400).send({
//       message: "All fields (userName, email, password, and cars) are required"
//     });
//   }

//   try {
//     let existingVendor = await Vendor.findOne({ email });
//     if (existingVendor) {
//       return res.status(409).send({
//         message: `Vendor with email ${email} already exists`
//       });
//     }
//     const hashedPassword = await auth.hashPassword(password);

//     const newVendor = new Vendor({
//       userName,
//       email,
//       password: hashedPassword,
//       passengers: {
//         cars
//       }
//     });

//     const savedVendor = await newVendor.save();

//     res.status(201).send({
//       message: "Vendor created successfully with car details",
//       vendor: savedVendor
//     });
//   } catch (error) {
//     res.status(500).send({
//       message: "Internal Server Error",
//       error: error.message
//     });
//   }
// };

const vendorSignup = async (req, res) => {
  const { userName, email, phoneNumber, address, password, confirmPassword } =
    req.body;

  if (
    !userName ||
    !email ||
    !phoneNumber ||
    !address ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).send({ message: "Please fill are required fields" });
  }

  try {
    const user = await vendorModel.findOne({ email });
    if (user) {
      return res
        .status(409)
        .send({ message: `Vendor with email ${email} already exists` });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .send({ message: "Password and Confirm Password does not match" });
    }

    const hashedPassword = await auth.hashPassword(password);

    const newVendor = new vendorModel({
      userName,
      email,
      phoneNumber,
      address,
      password: hashedPassword,
    });
    const savedVendor = await newVendor.save();

    res
      .status(201)
      .send({ message: "Vendor created successfully", savedVendor });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const vendorLogin = async(req,res)=>{
  const {email,password} = req.body
if(!email || !password){
  return res.status(400).send({message:"Please fill the all required fields"})
}
try {
  const user = await vendorModel.findOne({email})
  if(!user){
    return res.status(404).send({message:`Vendor with ${email} is does not exist`})
  }
  const hashCompare = await auth.hashCompare(password,user.password)

  if(hashCompare){
    const token = await auth.createToken({
      _id:user._id,
      email:user.email,
      phoneNumber:user.phoneNumber,
      address:user.address,
      role:user.role

    })

    res.status(201).send({message:"Vendor Login successfully",token,user})
  }
} catch (error) {
  res.status(500).send({
    message: "Internal Server Error",
    error: error.message,
  });
}
}

const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const sendEmail = async (email, pin) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset PIN",
    text: `Your password reset PIN is ${pin}. This PIN will expire in 3 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  try {
    const user = await vendorModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .send({ message: `No account found with email ${email}` });
    }

    const pin = generatePin();
    const pinExpiresAt = new Date(Date.now() + 1 * 60 * 1000);

    user.resetPin = pin;
    user.pinExpiresAt = pinExpiresAt;
    await user.save();

    await sendEmail(email, pin);

    res.status(201).send({
      message: "PIN sent to your email. It will expire in 3 minutes.",
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const validatePin = async (req, res) => {
  const {email, resetPin } = req.body;

  if (!resetPin || !email) {
    return res.status(400).send({ message: " Please fill all required fields" });
  }

  try {
    const user = await vendorModel.findOne({email});

    if (!user) {
      return res.status(404).send({ message: `Email is not exist` });
    }

    if(user.resetPin !== resetPin){
      return res.status(400).send({message:"Invalid Pin"})
    }

    if (!user.resetPin || !user.pinExpiresAt) {
      return res
        .status(400)
        .send({ message: "No valid PIN found for this account" });
    }

    const currentTime = new Date();
    if (currentTime > user.pinExpiresAt) {
      user.resetPin = null;
      user.pinExpiresAt = null;
      await user.save();

      return res.status(400).send({ message: "PIN has expired" });
    }

    if (user.resetPin !== resetPin) {
      return res.status(400).send({ message: "Invalid PIN" });
    }

    user.pinExpiresAt = null;

    await user.save();

    res.status(201).send({
      message: "PIN verified successfully. You can now reset your password.",
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { email,resetPin, newPassword, confirmPassword } = req.body;

  if (!email || !resetPin || !newPassword || !confirmPassword) {
    return res.status(400).send({ message: "Fill the all required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .send({ message: "New password and confirm password do not match" });
  }

  try {
    const user = await vendorModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .send({ message: "User not found" });
    }

    if(user.resetPin !== resetPin){
      return res.status(400).send({message:"session expired please regenerate the otp"})
    }

    const hashedPassword = await auth.hashPassword(newPassword);

    user.password = hashedPassword;
    user.resetPin = null;

    await user.save();

    res.status(200).send({ message: "Password has been reset successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorById = async (req, res) => {
  const { vendorId } = req.body;
  if (!vendorId) {
    return res.status(400).send({ message: "vendorId is required" });
  }
  try {
    const user = await vendorModel.findById({ _id: vendorId });
    if (!user) {
      return res.status(404).send({ message: "vendor not found" });
    }
    return res
      .status(200)
      .send({ message: "vendor fetched successfully", user });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const customers = await vendorModel.find();

    if (customers.length === 0) {
      return res.status(404).send({ message: "No vendors found" });
    }

    return res
      .status(200)
      .send({ message: "Vendors fetched successfully", customers });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};  

const editVendorProfile = async (req, res) => {
  const { _id, userName, email, phoneNumber, address } = req.body;

  if (!userName || !email || !phoneNumber || !address) {
    return res.status(400).send({ message: "Fill all required fields" });
  }
  try {
    const user = await vendorModel.findById({ _id: _id });
    if (!user) {
      return res.status(400).send({ message: "Vendor not found" });
    }

    (user.userName = userName),
      (user.email = email),
      (user.phoneNumber = phoneNumber),
      (user.address = address);

    await user.save();

    return res
      .status(201)
      .send({ message: "Vendor profile  updated successfully", user });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editPassword = async (req, res) => {
  const { _id, oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).send({ message: "Please fill all required fields" });
  }

  try {
    const user = await vendorModel.findById(_id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const isMatch = await auth.hashCompare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid Old Password" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .send({ message: "New password and Confirm password do not match" });
    }

    const hashedPassword = await auth.hashPassword(newPassword);

    user.password = hashedPassword;
    await user.save();

    res.status(201).send({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};


const createCar = async (req, res) => {
  const { vendorId, vehicleMake, vehicleModel, licensePlate, vehicleColor, numberOfSeats, milage } = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor || !numberOfSeats || !milage || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC
   ) {
    return res.status(400).send({ message: "All car details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const newCar = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage
    };
    

    vendor.vehicles.cars.push(newCar);
    const savedVendor = await vendor.save();

    const adminMessage = {
      title: "New Car Creation Request",
      description: `A new car has been created by vendor ${vendor.userName} (${vendor.email}).

      Please review the car details and approve it at your earliest convenience.`,
    };

    const admin = await adminModel.findOne();
    if (admin) {
      admin.messages.push(adminMessage);
      await admin.save();
    }

    res.status(201).send({ message: "Car created successfully", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};


const recreateCar = async (req, res) => {
  const { vendorId, vehicleId, vehicleMake, vehicleModel, licensePlate, vehicleColor, numberOfSeats, milage} = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor || !numberOfSeats || !milage || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC) {
    return res.status(400).send({ message: "All car details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const carIndex = vendor.vehicles.cars.find(car => car._id.toString() === vehicleId && car.vehicleApprovedByAdmin === 'rejected');
    if (!carIndex) {
      return res.status(404).send({ message: "Car not found or not rejected" });
    }
    vendor.vehicles.cars.splice(carIndex, 1);

    const newCar = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      vehicleApprovedByAdmin: 'pending'  
    };

    vendor.vehicles.cars.push(newCar);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "Car recreated successfully with pending status", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllVehiclesByVendor = async (req, res) => {
  try {
    const {vendorId} = req.params;
  
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: 'Vendor not found' });
    }
                
    const allVehicles = [
      ...vendor.vehicles.cars,
      ...vendor.vehicles.vans,
      ...vendor.vehicles.buses,
      ...vendor.vehicles.autos,
      ...vendor.vehicles.lorries,
      ...vendor.vehicles.trucks
    ];

    res.status(200).send({
      message: 'All vehicles fetched successfully',
      vehicles: allVehicles
    });
  } catch (error) {
    res.status(500).send({ message: 'Internal Server Error', error: error.message });
  }
};

const getVendorCars = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (!vendor.vehicles || !vendor.vehicles.cars || vendor.vehicles.cars.length === 0) {
      return res.status(404).send({ message: "No cars available for the vendor" });
    }

    const cars = vendor.vehicles.cars
    
    res.status(200).send({ message: "Approved cars retrieved successfully", cars });

  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const editCar = async(req,res)=>{
  const {vendorId , vehicleId} = req.params
const updatedData = req.body
const files = req.files
if (!vendorId || !vehicleId) {
  return res.status(400).send({ message: "VendorId and VehicleId are required" });
}

try {
  const vendor = await vendorModel.findById(vendorId)
  if(!vendor){
    return res.status(404).send({message:"Vendot not found "})
  }

  const carToUpdate = vendor.vehicles.cars.find(car => car._id.toString() === vehicleId);

  if(!carToUpdate){
    return res.status(404).send({message:"Car not found"})
  }

  if(files){
carToUpdate.ownerAdharCard = files?.ownerAdharCard ?`${process.env.baseURL}/${files.ownerAdharCard[0]?.path}` : carToUpdate.ownerAdharCard
carToUpdate.ownerImage = files?.ownerImage?`${process.env.baseURL}/${files?.ownerImage[0]?.path}`:carToUpdate.ownerImage
carToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense ? `${process.env.baseURL}/${files.ownerDrivingLicense[0]?.path}` : carToUpdate.ownerDrivingLicense;
carToUpdate.vehicleImages = files?.vehicleImages ? files.vehicleImages.map(file => `${process.env.baseURL}/${file.path}`) : carToUpdate.vehicleImages;
carToUpdate.vehicleInsurance = files?.vehicleInsurance ? `${process.env.baseURL}/${files.vehicleInsurance[0]?.path}` : carToUpdate.vehicleInsurance;
carToUpdate.vehicleRC = files?.vehicleRC ? `${process.env.baseURL}/${files.vehicleRC[0]?.path}` : carToUpdate.vehicleRC;  
}

carToUpdate.vehicleMake = updatedData.vehicleMake || carToUpdate.vehicleMake;
carToUpdate.vehicleModel = updatedData.vehicleModel || carToUpdate.vehicleModel;
carToUpdate.licensePlate = updatedData.licensePlate || carToUpdate.licensePlate;
carToUpdate.vehicleColor = updatedData.vehicleColor || carToUpdate.vehicleColor;
carToUpdate.numberOfSeats = updatedData.numberOfSeats || carToUpdate.numberOfSeats;
carToUpdate.milage = updatedData.milage || carToUpdate.milage;

const updatedcar = await vendor.save()

res.status(200).send({message:"Car updated successfully",updatedcar})

} catch (error) {
  res.status(500).send({ message: "Internal Server Error", error: error.message });

}

}


const createAuto = async(req,res)=>{
  const { vendorId, vehicleModel, licensePlate, numberOfSeats,} = req.body;
  const files = req.files

  if(!vendorId || !vehicleModel || !licensePlate || !numberOfSeats || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC){
    return res.status(400).send({message:"All auto details  are required"})
  }

  try {
    const vendor = await vendorModel.findById(vendorId)
    if(!vendor){
      return res.status(404).send({message:"Vendor not found"})
    }

    const newAuto = {
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleModel, 
      licensePlate, 
      numberOfSeats,
    }

    vendor.vehicles.autos.push(newAuto)
    const autoData = await vendor.save()

    res.status(201).send({message:"Auto created successfully",autoData})
  } catch (error) {

    res.status(500).send({ message: "Internal Server Error", error: error.message });

  }

}

const recreateAuto = async (req, res) => {
  const { vendorId,vehicleId, vehicleModel, licensePlate, numberOfSeats,} = req.body;
  const files = req.files;

  if(!vendorId || !vehicleId || !vehicleModel || !licensePlate || !numberOfSeats || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC){
    return res.status(400).send({message:"All car details  are required"})
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const autoIndex = vendor.vehicles.autos.find(car => car._id.toString() === vehicleId && car.vehicleApprovedByAdmin === 'rejected');
    if (!autoIndex) {
      return res.status(404).send({ message: "Car not found or not rejected" });
    }
    vendor.vehicles.autos.splice(autoIndex, 1);

    const newAuto = {
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleModel, 
      licensePlate, 
      numberOfSeats,
      vehicleApprovedByAdmin: 'pending'  
    };

    vendor.vehicles.autos.push(newAuto);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "Car recreated successfully with pending status", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorAuots = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (!vendor.vehicles || !vendor.vehicles.autos || vendor.vehicles.autos.length === 0) {
      return res.status(404).send({ message: "No autos available for the vendor" });
    }

    const autos = vendor.vehicles.autos
   
    res.status(200).send({ message: " autos retrieved successfully", autos });

  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const editAuto = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body; 
  const files = req.files;

  if (!vendorId || !vehicleId) {
    return res.status(400).send({ message: "VendorID and vehicleID are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const autoToUpdate = vendor.vehicles.autos.find(auto => auto._id.toString() === vehicleId);
    if (!autoToUpdate) {
      return res.status(404).send({ message: "Auto not found" });
    }

    if (files) {
      autoToUpdate.ownerAdharCard = files?.ownerAdharCard ? `${process.env.baseURL}/${files.ownerAdharCard[0]?.path}` : autoToUpdate.ownerAdharCard;
      autoToUpdate.ownerImage = files?.ownerImage ? `${process.env.baseURL}/${files.ownerImage[0]?.path}` : autoToUpdate.ownerImage;
      autoToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense ? `${process.env.baseURL}/${files.ownerDrivingLicense[0]?.path}` : autoToUpdate.ownerDrivingLicense;
      autoToUpdate.vehicleImages = files?.vehicleImages ? files.vehicleImages.map(file => `${process.env.baseURL}/${file.path}`) : autoToUpdate.vehicleImages;
      autoToUpdate.vehicleInsurance = files?.vehicleInsurance ? `${process.env.baseURL}/${files.vehicleInsurance[0]?.path}` : autoToUpdate.vehicleInsurance;
      autoToUpdate.vehicleRC = files?.vehicleRC ? `${process.env.baseURL}/${files.vehicleRC[0]?.path}` : autoToUpdate.vehicleRC;
    }

    autoToUpdate.vehicleModel = updatedData.vehicleModel || autoToUpdate.vehicleModel;
    autoToUpdate.numberOfSeats = updatedData.numberOfSeats || autoToUpdate.numberOfSeats;
    autoToUpdate.licensePlate = updatedData.licensePlate || autoToUpdate.licensePlate;

    await vendor.save();

    res.status(201).send({ message: "Auto updated successfully", auto: autoToUpdate });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};


const createVan = async(req,res)=>{
  const { vendorId, vehicleMake, vehicleModel, licensePlate, vehicleColor, numberOfSeats, milage,} = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor || !numberOfSeats || !milage || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC) {
    return res.status(400).send({ message: "All van details and vendorId are required" });
  }
 
  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

  
    const newVan = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats, 
      milage,
      
  
    };

    vendor.vehicles.vans.push(newVan);
    const savedVendor = await vendor.save();
    res.status(201).send({ message: "Van created successfully", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const recreateVan = async (req, res) => {
  const { vendorId, vehicleId, vehicleMake, vehicleModel, licensePlate, vehicleColor, numberOfSeats, milage} = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor || !numberOfSeats || !milage || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC) {
    return res.status(400).send({ message: "All van details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const vanIndex = vendor.vehicles.vans.find(van => van._id.toString() === vehicleId && van.vehicleApprovedByAdmin === 'rejected');
    if (!vanIndex) {
      return res.status(404).send({ message: "van not found or not rejected" });
    }
    vendor.vehicles.vans.splice(vanIndex, 1);

    const newVan = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      vehicleApprovedByAdmin: 'pending'  
    };

    vendor.vehicles.vans.push(newVan);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "Car recreated successfully with pending status", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorVans = async(req,res)=>{
  try {
    const {vendorId} = req.params

    const vendor = await vendorModel.findById(vendorId)
    if(!vendor){
      return res.status(404).send({message:"vendor not found"})
    }

    if (!vendor.vehicles || !vendor.vehicles.vans || vendor.vehicles.vans.length === 0) {
      return res.status(404).send({ message: "No vans available for the vendor" });
    }

    const vanData = vendor.vehicles.vans

    res.status(200).send({message:"Vans fetched successfully",vanData})


  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });

  }
}

const editVan = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body; 
  const files = req.files;

  if (!vendorId || !vehicleId) {
    return res.status(400).send({ message: "VendorID and vehicleID are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const vanToUpdate = vendor.vehicles.vans.find(van => van._id.toString() === vehicleId);
    if (!vanToUpdate) {
      return res.status(404).send({ message: "van not found" });
    }

    if (files) {
      vanToUpdate.ownerAdharCard = files?.ownerAdharCard ? `${process.env.baseURL}/${files.ownerAdharCard[0]?.path}` : vanToUpdate.ownerAdharCard;
      vanToUpdate.ownerImage = files?.ownerImage ? `${process.env.baseURL}/${files.ownerImage[0]?.path}` : vanToUpdate.ownerImage;
      vanToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense ? `${process.env.baseURL}/${files.ownerDrivingLicense[0]?.path}` : vanToUpdate.ownerDrivingLicense;
      vanToUpdate.vehicleImages = files?.vehicleImages ? files.vehicleImages.map(file => `${process.env.baseURL}/${file.path}`) : vanToUpdate.vehicleImages;
      vanToUpdate.vehicleInsurance = files?.vehicleInsurance ? `${process.env.baseURL}/${files.vehicleInsurance[0]?.path}` : vanToUpdate.vehicleInsurance;
      vanToUpdate.vehicleRC = files?.vehicleRC ? `${process.env.baseURL}/${files.vehicleRC[0]?.path}` : vanToUpdate.vehicleRC;
    }

    vanToUpdate.vehicleModel = updatedData.vehicleModel || vanToUpdate.vehicleModel;
    vanToUpdate.numberOfSeats = updatedData.numberOfSeats || vanToUpdate.numberOfSeats;
    vanToUpdate.licensePlate = updatedData.licensePlate || vanToUpdate.licensePlate;
    vanToUpdate.vehicleMake = updatedData.vehicleMake || vanToUpdate.vehicleMake;
    vanToUpdate.vehicleColor = updatedData.vehicleColor || vanToUpdate.vehicleColor;
    vanToUpdate.milage = updatedData.milage || vanToUpdate.milage;

    await vendor.save();

    res.status(201).send({ message: "Auto updated successfully", auto: vanToUpdate });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};


const createbus = async (req, res) => {
  const { vendorId, vehicleMake, vehicleModel, licensePlate, vehicleColor, numberOfSeats, milage , ac } = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor || !numberOfSeats || !milage || !ac || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC
   ) {
    return res.status(400).send({ message: "All bus details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const newBus = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      ac
    };
    

    vendor.vehicles.buses.push(newBus);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "Bus created successfully", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const recreatebus = async (req, res) => {
  const { vendorId, vehicleId, vehicleMake, vehicleModel, licensePlate, vehicleColor, numberOfSeats, milage , ac} = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor || !numberOfSeats || !milage || !ac || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC) {
    return res.status(400).send({ message: "All bus details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const busIndex = vendor.vehicles.buses.find(bus => bus._id.toString() === vehicleId && bus.vehicleApprovedByAdmin === 'rejected');
    if (!busIndex) {
      return res.status(404).send({ message: "bus not found or not rejected" });
    }
    vendor.vehicles.buses.splice(busIndex, 1);

    const newBus = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      vehicleApprovedByAdmin: 'pending' ,
      ac
    };

    vendor.vehicles.buses.push(newBus);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "bus recreated successfully with pending status", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorBus = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (!vendor.vehicles || !vendor.vehicles.buses || vendor.vehicles.buses.length === 0) {
      return res.status(404).send({ message: "No buses available for the vendor" });
    }

    const buses = vendor.vehicles.cars
    
    res.status(200).send({ message: " Buses retrieved successfully", buses });

  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const editBus = async(req,res)=>{
  const {vendorId , vehicleId} = req.params
const updatedData = req.body
const files = req.files
if (!vendorId || !vehicleId) {
  return res.status(400).send({ message: "VendorId and VehicleId are required" });
}

try {
  const vendor = await vendorModel.findById(vendorId)
  if(!vendor){
    return res.status(404).send({message:"Vendot not found "})
  }

  const busToUpdate = vendor.vehicles.buses.find(bus => bus._id.toString() === vehicleId);

  if(!busToUpdate){
    return res.status(404).send({message:"bus not found"})
  }

  if(files){
busToUpdate.ownerAdharCard = files?.ownerAdharCard ?`${process.env.baseURL}/${files.ownerAdharCard[0]?.path}` : busToUpdate.ownerAdharCard
busToUpdate.ownerImage = files?.ownerImage?`${process.env.baseURL}/${files?.ownerImage[0]?.path}`:busToUpdate.ownerImage
busToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense ? `${process.env.baseURL}/${files.ownerDrivingLicense[0]?.path}` : busToUpdate.ownerDrivingLicense;
busToUpdate.vehicleImages = files?.vehicleImages ? files.vehicleImages.map(file => `${process.env.baseURL}/${file.path}`) : busToUpdate.vehicleImages;
busToUpdate.vehicleInsurance = files?.vehicleInsurance ? `${process.env.baseURL}/${files.vehicleInsurance[0]?.path}` : busToUpdate.vehicleInsurance;
busToUpdate.vehicleRC = files?.vehicleRC ? `${process.env.baseURL}/${files.vehicleRC[0]?.path}` : busToUpdate.vehicleRC;  
}

busToUpdate.vehicleMake = updatedData.vehicleMake || busToUpdate.vehicleMake;
busToUpdate.vehicleModel = updatedData.vehicleModel || busToUpdate.vehicleModel;
busToUpdate.licensePlate = updatedData.licensePlate || busToUpdate.licensePlate;
busToUpdate.vehicleColor = updatedData.vehicleColor || busToUpdate.vehicleColor;
busToUpdate.numberOfSeats = updatedData.numberOfSeats || busToUpdate.numberOfSeats;
busToUpdate.milage = updatedData.milage || busToUpdate.milage;
busToUpdate.ac = updatedData.ac || busToUpdate.ac

const updatedBus = await vendor.save()

res.status(200).send({message:"Bus updated successfully",updatedBus})

} catch (error) {
  res.status(500).send({ message: "Internal Server Error", error: error.message });

}

}

const createTruck = async (req, res) => {
  const { vendorId, vehicleMake, vehicleModel, licensePlate, vehicleColor,ton,size } = req.body;
  const files = req.files;

  if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor ||  !ton || !size || !files.ownerAdharCard || !files.ownerImage || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC
   ) {
    return res.status(400).send({ message: "All truck details are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const newTruck = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      ton,
      size
    };
    

    vendor.vehicles.trucks.push(newTruck);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "truck created successfully", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const recreateTruck = async (req, res) => {
  const { vendorId,vehicleId, vehicleMake, vehicleModel, licensePlate, vehicleColor,ton,size } = req.body;
  const files = req.files;

  if (!vendorId || !vehicleId || !vehicleMake || !vehicleModel || !licensePlate || !vehicleColor ||  !ton || !size || !files.ownerAdharCard || !files.ownerAdharCard || !files.ownerDrivingLicense
    || files.vehicleImages.length!==5|| !files.vehicleInsurance || !files.vehicleRC
   ) {
    return res.status(400).send({ message: "All truck details are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const truckIndex = vendor.vehicles.trucks.find(truck => truck._id.toString() === vehicleId && truck.vehicleApprovedByAdmin === 'rejected');
    if (!truckIndex) {
      return res.status(404).send({ message: "truck not found or not rejected" });
    }
    vendor.vehicles.trucks.splice(truckIndex, 1);

    const newTruck = {
      ownerAdharCard:`${process.env.baseURL}/${files?.ownerAdharCard[0]?.path}`,
      ownerImage:`${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerDrivingLicense: `${process.env.baseURL}/${files?.ownerDrivingLicense[0]?.path}`,
      vehicleImages: files?.vehicleImages.map((file)=>`${process.env.baseURL}/${file.path}`),
      vehicleInsurance: `${process.env.baseURL}/${files?.vehicleInsurance[0]?.path}`,
      vehicleRC: `${process.env.baseURL}/${files?.vehicleRC[0]?.path}`,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      ton,
      size,
      vehicleApprovedByAdmin: 'pending'  
    };

    vendor.vehicles.trucks.push(newTruck);
    const savedVendor = await vendor.save();

    res.status(201).send({ message: "Truck recreated successfully with pending status", savedVendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorTruck= async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (!vendor.vehicles || !vendor.vehicles.trucks || vendor.vehicles.trucks.length === 0) {
      return res.status(404).send({ message: "No trucks available for the vendor" });
    }

    const trucks = vendor.vehicles.trucks
    
    res.status(200).send({ message: " Trucks retrieved successfully", trucks });

  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const editTruck = async(req,res)=>{
  const {vendorId , vehicleId} = req.params
const updatedData = req.body
const files = req.files
if (!vendorId || !vehicleId) {
  return res.status(400).send({ message: "VendorId and VehicleId are required" });
}

try {
  const vendor = await vendorModel.findById(vendorId)
  if(!vendor){
    return res.status(404).send({message:"Vendot not found "})
  }

  const truckToUpdate = vendor.vehicles.trucks.find(truck => truck._id.toString() === vehicleId);

  if(!truckToUpdate){
    return res.status(404).send({message:"trucks not found"})
  }

  if(files){
truckToUpdate.ownerAdharCard = files?.ownerAdharCard ?`${process.env.baseURL}/${files.ownerAdharCard[0]?.path}` : truckToUpdate.ownerAdharCard
truckToUpdate.ownerImage = files?.ownerImage?`${process.env.baseURL}/${files?.ownerImage[0]?.path}`:truckToUpdate.ownerImage
truckToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense ? `${process.env.baseURL}/${files.ownerDrivingLicense[0]?.path}` : truckToUpdate.ownerDrivingLicense;
truckToUpdate.vehicleImages = files?.vehicleImages ? files.vehicleImages.map(file => `${process.env.baseURL}/${file.path}`) : truckToUpdate.vehicleImages;
truckToUpdate.vehicleInsurance = files?.vehicleInsurance ? `${process.env.baseURL}/${files.vehicleInsurance[0]?.path}` : truckToUpdate.vehicleInsurance;
truckToUpdate.vehicleRC = files?.vehicleRC ? `${process.env.baseURL}/${files.vehicleRC[0]?.path}` : truckToUpdate.vehicleRC;  
}

truckToUpdate.vehicleMake = updatedData.vehicleMake || truckToUpdate.vehicleMake;
truckToUpdate.vehicleModel = updatedData.vehicleModel || truckToUpdate.vehicleModel;
truckToUpdate.licensePlate = updatedData.licensePlate || truckToUpdate.licensePlate;
truckToUpdate.vehicleColor = updatedData.vehicleColor || truckToUpdate.vehicleColor;
truckToUpdate.ton = updatedData.ton || truckToUpdate.ton;
truckToUpdate.size = updatedData.size || truckToUpdate.size;

const updatedTruck = await vendor.save()

res.status(201).send({message:"Car updated successfully",updatedTruck})

} catch (error) {
  res.status(500).send({ message: "Internal Server Error", error: error.message });

}

}

const getBookingsByVendorId = async (req,res)=>{
  const { vendorId } = req.params; 

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }
 
  try {
    const bookings = await bookingModel.find({ "car.vendorId": new mongoose.Types.ObjectId(vendorId) });

    if (bookings.length === 0) {
      return res.status(404).send({ message: "No bookings found for this Vendor" });
    } 

    res.status(200).send({ message: "Bookings retrieved successfully", bookings });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
}

const vendorBookingApproval = async (req, res) => {
  const { bookingId , totalFare , vendorRejectedReason , vendorApprovedStatus } = req.body;

  if (!bookingId) {
    return res.status(400).send({ message: "Booking ID is required" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    const vendor = await vendorModel.findById(booking.vehicleDetails.vendorId);
    const customer = await customerModel.findById(booking.customer.customerId);

    if (!vendor || !customer) {
      return res.status(404).send({ message: "Vendor or Customer not found" });
    }

    const targetVehicleId = booking.vehicleDetails.foundVehicle._id.toString();

    const vehicleCategories = Object.values(vendor.vehicles);
    
    let foundVehicle = null;
    
    for (const category of vehicleCategories) {
      foundVehicle = category.find((vehicle) => vehicle._id.toString() === targetVehicleId);
      
      if (foundVehicle) {
        break; 
      }
    } 
    if (!foundVehicle) {
      return res.status(404).send({ message: "Vehicle not found in the vendor's inventory" });
    }

    if (vendorApprovedStatus === "rejected") {

      if (!vendorRejectedReason) {
        return res.status(400).send({ message: "Please provide a reason for rejection" });
      }

      const currentMonthRejections = vendor.rejectionHistory.filter(rejection => {
        const rejectionDate = new Date(rejection.date);
        const now = new Date();
        return (
          rejectionDate.getMonth() === now.getMonth() &&
          rejectionDate.getFullYear() === now.getFullYear()
        );
      });

      if (currentMonthRejections.length >= 2) {
        return res.status(403).send({
          message: "You have exceeded the rejection limit for this month. You can only reject bookings two times in a month.",
        });
      }

      vendor.rejectionHistory.push({ date: new Date() });

      foundVehicle.vehicleAvailable = "yes";
      foundVehicle.returnDate = undefined;
      // foundVehicle.tripStatus = 'cancelled' 

      await vendor.save();
      booking.vendorRejectedReason = vendorRejectedReason;
      booking.vendorApprovedStatus = "rejected";
      await booking.save();
 
      const rejectionMessage = {
        title: "Booking Rejected",
        description: `Dear ${customer.userName}, your booking for the vehicle ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been rejected. Reason: ${vendorRejectedReason}.`
      };
      customer.messages.push(rejectionMessage);
      await customer.save();

      return res.status(200).send({ message: "Booking rejected successfully", booking });
    }

    if (vendorApprovedStatus === "approved") {
      if (!totalFare) {
        return res.status(400).send({ message: "Total fare is required for approval" });
      }

      const commissionPercentage = foundVehicle.adminCommissionPercentage;
      const adminCommissionAmount = (commissionPercentage / 100) * totalFare;

      booking.totalFare = totalFare;
      booking.vendorApprovedStatus = "approved";
      booking.remainingPayment = totalFare - booking.advanceAmount;
      booking.adminCommissionAmount = adminCommissionAmount;
      booking.vendorTotalPayment = totalFare - adminCommissionAmount 
      booking.tripStatus = 'start'

      await booking.save();

      const approvalMessage = {
        title: "Booking Approved",
        description: `Dear ${customer.userName}, your booking for the vehicle ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been approved. Total fare is ${totalFare}, with remaining payment of ${booking.remainingPayment}.`
      };
      customer.messages.push(approvalMessage);
      await customer.save();

      return res.status(200).send({ message: "Booking approved successfully", booking });
    }

    res.status(400).send({ message: "Invalid vendorApprovedStatus" });

  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const vendorCompleteRide = async (req, res) => {
  const { bookingId, paymentMethod } = req.body;

  if (!bookingId) {
    return res.status(400).send({ message: "Booking ID is required" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    const vendor = await vendorModel.findById(booking.vehicleDetails.vendorId);
    const customer = await customerModel.findById(booking.customer.customerId);

    if (!vendor || !customer) {
      return res.status(404).send({ message: "Vendor or Customer not found" });
    }

    const targetVehicleId = booking.vehicleDetails.foundVehicle._id.toString();
    const vehicleCategories = Object.values(vendor.vehicles);

    let foundVehicle = null;
    for (const category of vehicleCategories) {
      foundVehicle = category.find(vehicle => vehicle._id.toString() === targetVehicleId);
      if (foundVehicle) {
        break;
      }
    }

    if (!foundVehicle) {
      return res.status(404).send({ message: "Vehicle not found in the vendor's inventory" });
    }

    foundVehicle.vehicleAvailable = 'yes';
    vendor.noOfBookings = vendor.noOfBookings ? vendor.noOfBookings + 1 : 1;
    vendor.totalEarnings =  vendor.totalEarnings?  vendor.totalEarnings + booking.vendorTotalPayment : booking.vendorTotalPayment
 
    await vendor.save();

    booking.completedAt = new Date();  
    booking.paymentMethod = paymentMethod;
    booking.tripStatus = 'completed';

    await booking.save();
 
    return res.status(200).send({ message: "Trip completed successfully",booking});

  } catch (error) {
    return res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};


const storeFCMTokenToVendor = async (req, res) => {
  const { vendorId, fcmToken } = req.body;

  if (!vendorId || !fcmToken) {
    return res.status(400).send({ message: "Vendor ID and FCM token are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    vendor.fcmToken = fcmToken;
    await vendor.save();

    res.status(200).send({ message: "FCM token stored successfully",vendor });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};


const getVendorBookingsByMonth = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByMonth = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed", 
          bookedAt: { $exists: true, $type: "date" } 
        }
      },
      {
        $project: {
          year: { $year: "$bookedAt" }, 
          month: { $month: "$bookedAt" }, 
          vendorTotalPayment: 1, 
          bookingDetails: "$$ROOT" 
        }
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          bookings: { $push: "$bookingDetails" } 
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    if (bookingsByMonth.length === 0) {
      return res.status(404).send({ message: "No bookings found for this vendor." });
    }

    res.status(200).send({
      message: "Monthly bookings data fetched successfully",
      bookingsByMonth
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorBookingsByWeek = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByWeek = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed",
          bookedAt: { $exists: true, $type: "date" } // Ensure valid booking dates
        }
      },
      {
        $project: {
          year: { $year: "$bookedAt" },
          month: { $month: "$bookedAt" },
          week: { $isoWeek: "$bookedAt" }, // Get the ISO week number
          vendorTotalPayment: 1,
          bookingDetails: "$$ROOT"
        }
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", week: "$week" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          bookings: { $push: "$bookingDetails" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 } // Sort by year, month, week
      }
    ]);

    if (bookingsByWeek.length === 0) {
      return res.status(404).send({ message: "No bookings found for this vendor." });
    }

    // Format the response to show weekly date ranges
    const formattedBookings = bookingsByWeek.map((weekData) => {
      const firstDayOfWeek = getFirstDayOfWeek(weekData._id.year, weekData._id.week);
      const lastDayOfWeek = getLastDayOfWeek(weekData._id.year, weekData._id.week);

      return {
        weekRange: `${formatDate(firstDayOfWeek)} - ${formatDate(lastDayOfWeek)}`,
        totalVendorPayment: weekData.totalVendorPayment,
        bookings: weekData.bookings,
      };
    });

    res.status(200).send({
      message: "Weekly bookings data fetched successfully",
      bookingsByWeek: formattedBookings,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorBookingsByMonthAndWeek = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByMonthAndWeek = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed",
          bookedAt: { $exists: true, $type: "date" } // Ensure valid booking dates
        }
      },
      {
        $project: {
          year: { $year: "$bookedAt" },
          month: { $month: "$bookedAt" },
          week: { $isoWeek: "$bookedAt" }, // Get the ISO week number
          vendorTotalPayment: 1,
          bookingDetails: "$$ROOT"
        }
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", week: "$week" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          bookings: { $push: "$bookingDetails" }
        }
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          totalMonthlyVendorPayment: { $sum: "$totalVendorPayment" }, // Sum of all weeks in the month
          weeklyData: {
            $push: {
              week: "$_id.week",
              totalVendorPayment: "$totalVendorPayment",
              bookings: "$bookings"
            }
          }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 } // Sort by year and month
      }
    ]);

    if (bookingsByMonthAndWeek.length === 0) {
      return res.status(404).send({ message: "No bookings found for this vendor." });
    }

    // Format the response to show both month-wise and week-wise breakdown
    const formattedBookings = bookingsByMonthAndWeek.map((monthData) => {
      // Get the first and last day of each week
      const weeklyDataFormatted = monthData.weeklyData.map((weekData) => {
        const firstDayOfWeek = getFirstDayOfWeek(monthData._id.year, weekData.week);
        const lastDayOfWeek = getLastDayOfWeek(monthData._id.year, weekData.week);

        return {
          weekRange: `${formatDate(firstDayOfWeek)} - ${formatDate(lastDayOfWeek)}`,
          totalVendorPayment: weekData.totalVendorPayment,
          bookings: weekData.bookings,
        };
      });

      return {
        month: `${monthData._id.month}-${monthData._id.year}`,
        totalMonthlyVendorPayment: monthData.totalMonthlyVendorPayment,
        weeks: weeklyDataFormatted
      };
    });

    res.status(200).send({
      message: "Monthly and weekly bookings data fetched successfully",
      bookingsByMonthAndWeek: formattedBookings,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

// Helper function to get the first day of a given ISO week in a month
const getFirstDayOfWeek = (year, week) => {
  const firstDayOfYear = new Date(year, 0, 1); // Start of the year
  const dayOffset = (week - 1) * 7; // Calculate offset by week
  const firstDayOfWeek = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + dayOffset));
  
  // Ensure the day doesn't exceed into a previous year
  if (firstDayOfWeek.getFullYear() > year) return new Date(year, 0, 1);
  return firstDayOfWeek;
};

// Helper function to get the last day of a given ISO week
const getLastDayOfWeek = (year, week) => {
  const firstDayOfWeek = getFirstDayOfWeek(year, week);
  return new Date(firstDayOfWeek.setDate(firstDayOfWeek.getDate() + 6)); // Add 6 days to get the last day of the week
};

// Helper function to format the date as "dd MMM yyyy"
const formatDate = (date) => {
  return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
};



module.exports = {
  vendorSignup,
  vendorLogin,
  forgotPassword,
  validatePin,
  resetPassword,
  getVendorById,
  getAllVendors,
  editVendorProfile,
  editPassword,
  createCar,
  recreateCar,
  getAllVehiclesByVendor,
  getVendorCars,
  editCar,
  createAuto,
  recreateAuto,
  getVendorAuots,
  editAuto,
  createVan,
  recreateVan,
  getVendorVans,
  editVan,
  createbus,
  recreatebus, 
  getVendorBus,
  editBus,
  createTruck,
  recreateTruck,
  getVendorTruck,
  editTruck,
  getBookingsByVendorId,
  vendorBookingApproval,
  storeFCMTokenToVendor,
  vendorCompleteRide, 
  getVendorBookingsByMonth,
  getVendorBookingsByMonthAndWeek
};
  