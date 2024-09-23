const vendorModel = require("../models/vendor");
const adminModel = require("../models/admin");
const auth = require("../middleware/auth");
const bookingModel = require("../models/booking");
// const vehicleModel = require('../models/')

const createAdmin = async (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    return res.status(400).send({ message: "Fill all required fields" });
  }

  try {
    const admin = await adminModel.findOne({ email });
    if (admin) {
      return res
        .status(409)
        .send({ message: `Account with ${email} already exist` });
    }

    const hashedPassword = await auth.hashPassword(password);

    const adminData = await adminModel.create({
      ...req.body,
      password: hashedPassword,
    });
    res.status(201).send({ message: "Admin created successfully", adminData });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .send({ message: "Please fill all required fields." });
  }

  try {
    const admin = await adminModel.findOne({ email });
    if (!admin) {
      return res.status(404).send({ message: "Admin not found." });
    }

    const isPasswordValid = await auth.hashCompare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).send({ message: "Incorrect password." });
    }

    const token = await auth.createToken({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    res.status(201).send({ message: "Login successful.", token, admin });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const passengersVehicleApproval = async (req, res) => {
  const { vendorId, vechicleId, action, rejectedReason,commission } = req.body;

  if (!vendorId || !vechicleId || !action) {
    return res.status(400).send({ message: "Fill all the required fields" });
  }

  if (!["approved", "rejected"].includes(action)) {
    return res
      .status(400)
      .send({ message: "Action must be 'approved' or 'rejected'" });
  }

  try { 
    const vendor = await vendorModel.findById({ _id: vendorId });

    const vehicle = await vehi
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    let foundVehicle = null;
    const categories = ["cars", "vans", "buses", "autos", "lorries", "trucks"];

    for (const category of categories) {
      const vehicle = vendor.vehicles[category].id(vechicleId);
      if (vehicle) {
        foundVehicle = vehicle;
        break;
      }
    }  
 
    if (!foundVehicle) {
      return res.status(404).send({ message: "Vehicle not found" });
    }

    if (action === "rejected" && !rejectedReason) {
      return res
        .status(400)
        .send({ message: "Please provide the rejected reason" });
    }
    if(action === "approved" && !commission){
        return res
        .status(400)
        .send({ message: "Please provide the commission" });
    }
    

    foundVehicle.vehicleApprovedByAdmin = action;
    foundVehicle.rejectedReason = rejectedReason ? rejectedReason : "-";
    foundVehicle.vehicleAvailable = action === "rejected" ? foundVehicle.vehicleAvailable : "yes";
    foundVehicle.adminCommissionPercentage = commission
 
    await vendor.save();

    res.status(200).send({ message: `Vehicle ${action} successfully`,foundVehicle });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllPendingVehicles = async (req, res) => {
  try {
    const vendors = await vendorModel.find({
      $or: [
        { "vehicles.cars.vehicleApprovedByAdmin": "pending" },
        { "vehicles.vans.vehicleApprovedByAdmin": "pending" },
        { "vehicles.buses.vehicleApprovedByAdmin": "pending" },
        { "vehicles.autos.vehicleApprovedByAdmin": "pending" },
        { "vehicles.lorries.vehicleApprovedByAdmin": "pending" },
        { "vehicles.trucks.vehicleApprovedByAdmin": "pending" },
      ],
    });

    const pendingVehicles = [];

    vendors.forEach((vendor) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];
      categories.forEach((category) => {
        vendor.vehicles[category].forEach((vehicle) => {
          if (vehicle.vehicleApprovedByAdmin === "pending") {
            pendingVehicles.push({
              vendorId: vendor._id,
              vehicleId: vehicle._id,
              userName: vendor.userName,
              email: vendor.email,
              phoneNumber: vendor.phoneNumber,
              address: vendor.address,
              category,
              vehicleDetails: vehicle,
            });
          }
        });
      });
    });

    res.status(200).send({
      message: "Pending vehicles fetched successfully",
      pendingVehicles,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllApprovedVehicles = async (req, res) => {
  try {
    const vendors = await vendorModel.find({
      $or: [
        { "vehicles.cars.vehicleApprovedByAdmin": "approved" },
        { "vehicles.vans.vehicleApprovedByAdmin": "approved" },
        { "vehicles.buses.vehicleApprovedByAdmin": "approved" },
        { "vehicles.autos.vehicleApprovedByAdmin": "approved" },
        { "vehicles.lorries.vehicleApprovedByAdmin": "approved" },
        { "vehicles.trucks.vehicleApprovedByAdmin": "approved" },
      ],
    });
    if (!vendors) {
      return res.status(404).send({ message: "Approved dara is not found" });
    }

    const approvedVechicles = [];

    vendors.forEach((vendor) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];
      categories.forEach((category) => {
        vendor.vehicles[category].forEach((vehicle) => {
          if (vehicle.vehicleApprovedByAdmin === "approved") {
            approvedVechicles.push({
              vendorId: vendor._id,
              vehicleId: vehicle._id,
              userName: vendor.userName,
              email: vendor.email,
              phoneNumber: vendor.phoneNumber,
              address: vendor.address,
              category,
              vehicleDetails: vehicle,
            });
          }
        });
      });
    });

    res.status(200).send({
      message: "Approved vehicles fetched successfully",
      approvedVechicles,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  const { vendorId, vehicleId } = req.params;

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }
    const categories = ["cars", "vans", "buses", "autos", "lorries", "trucks"];

    let vehicleFound = false;

    for (const category of categories) {
      const vehicleIndex = vendor.vehicles[category].findIndex(
        (vehicle) => vehicle._id.toString() === vehicleId
      );

      if (vehicleIndex !== -1) {
        vendor.vehicles[category].splice(vehicleIndex, 1);
        vehicleFound = true;
        break;
      } 
    }

    if (!vehicleFound) {
      return res.status(404).send({ message: "Vehicle not found" });
    }
    await vendor.save();

    res.status(200).send({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllVehicles = async (req, res) => {
  try {
    const vendor = await vendorModel.find();

    const allVehicles = [];

    vendor.forEach((vendors) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];

      categories.forEach((category) => {
        vendors.vehicles[category].forEach((vehicle) => {
          allVehicles.push({
            vendorId: vendors._id,
            vehicleId: vehicle._id,
            userName: vendors.userName,
            email: vendors.email,
            phoneNumber: vendors.phoneNumber,
            address: vendors.address,
            category,
            vehicleDetails: vehicle,
          });
        });
      });
    });


    res.status(200).send({message:"Vehicles fetched successfully",allVehicles})
  } catch (error) {
    res
    .status(500)
    .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLBookings = async(req,res)=>{
    try {
        const bookings = await bookingModel.find()
 if(bookings.length === 0){
  return res.status(404).send({message:"No bookings  found"})
 }

 res.status(200).send({message:"Booking fetched successfully",bookings})
    } catch (error) {
        res
        .status(500)
        .send({ message: "Internal Server Error", error: error.message });
    }
} 

module.exports = {
  passengersVehicleApproval,
  createAdmin,
  login,
  getAllPendingVehicles,
  getAllApprovedVehicles,
  deleteVehicle,
  getAllVehicles,
  getALLBookings
};
