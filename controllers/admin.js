const vendorModel = require("../models/vendor");
const adminModel = require("../models/admin");
const auth = require("../middleware/auth");
const bookingModel = require("../models/booking");
const customerModel = require("../models/customer");
const {customerChat , customerMessage} = require('../models/chatandMessageForCustomer');
const { vendorChat, vendorMessage } = require("../models/chatAndMessageForVendor");
// const customerMessage = require("../models/customerMessage");

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
  const { vendorId, vechicleId, action, rejectedReason, commission } = req.body;

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

    // const vehicle = await
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
    if (action === "approved" && !commission) {
      return res.status(400).send({ message: "Please provide the commission" });
    }

    foundVehicle.vehicleApprovedByAdmin = action;
    foundVehicle.rejectedReason = rejectedReason ? rejectedReason : "-";
    foundVehicle.vehicleAvailable =
      action === "rejected" ? foundVehicle.vehicleAvailable : "yes";
    foundVehicle.adminCommissionPercentage = commission;

    await vendor.save();

    res
      .status(200)
      .send({ message: `Vehicle ${action} successfully`, foundVehicle });
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

    res
      .status(200)
      .send({ message: "Vehicles fetched successfully", allVehicles });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find();
    if (bookings.length === 0) {
      return res.status(404).send({ message: "No bookings  found" });
    }

    res.status(200).send({ message: "Booking fetched successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const cancelBookingByAdmin = async (req, res) => {
  const { bookingId, reason } = req.body;

  if (!bookingId || !reason) {
    return res.status(400).send({ message: "Fill all  required fields" });
  } 

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    const customerId = booking.customer.customerId;
    const vendorId = booking.vehicleDetails.vendorId;

    const customer = await customerModel.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const targetVehicleId = booking.vehicleDetails.foundVehicle._id.toString();
    const vehicleCategories = Object.values(vendor.vehicles);
    let foundVehicle = null;

    for (const category of vehicleCategories) {
      foundVehicle = category.find(
        (vehicle) => vehicle._id.toString() === targetVehicleId
      );
      if (foundVehicle) {
        break;
      }
    }

    if (!foundVehicle) {
      return res
        .status(404)
        .send({ message: "Vehicle not found in the vendor's inventory" });
    }

    const activeBookings = await bookingModel.find({
      "vehicleDetails.foundVehicle._id": foundVehicle._id,
      vendorApprovedStatus: { $in: ["pending", "approved"] },
      tripStatus: { $nin: ["ongoing", "completed", "cancelled"] },
    });

    const vehicleAvailableLogic = () => {
      if (activeBookings.length > 0) {
        foundVehicle.vehicleAvailable = "no";
      } else {
        foundVehicle.vehicleAvailable = "yes";
        foundVehicle.returnDate = undefined;
      }
    };

    vehicleAvailableLogic();
    await vendor.save();

    booking.adminCancelled = true;
    booking.adminCancelledReason = reason;
    booking.tripStatus = "cancelled";
    await booking.save();

    const cancellationMessageForVendor = {
      title: "Booking Cancelled",
      description: `Dear ${vendor.userName}, the booking for the ${foundVehicle.subCategory} ,${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been cancelled by the admin. Reason: ${reason}`,
    };
    vendor.messages.push(cancellationMessageForVendor);
    await vendor.save();

    const cancellationMessageForCustomer = {
      title: "Booking Cancelled",
      description: `Dear ${customer.userName}, the booking for the ${foundVehicle.subCategory} , ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been cancelled by the admin. Reason: ${reason}`,
    };

    customer.messages.push(cancellationMessageForCustomer);
    await customer.save();

    res
      .status(200)
      .send({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLCompletedBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find({tripStatus:{$in:["completed"]}});
    if (bookings.length === 0) {
      return res.status(404).send({ message: "No bookings  found" });
    }

    res.status(200).send({ message: "Bookings fetched successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLCancelledBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find({tripStatus:{$in:["cancelled"]}});
    if (bookings.length === 0) {
      return res.status(404).send({ message: "No bookings  found" });
    }

    res.status(200).send({ message: "Bookings fetched successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const CreateCustomerBannerImg = async (req, res) => {
  const files = req.files;

  if (!files?.banner1 ||!files?.banner2 || !files?.banner3 ) {
    return res.status(400).send({ message: "Please upload all three images" });
  }

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

     admin.CustomerbannerImgs ={
      banner1:`${process.env.baseURL}/${files?.banner1[0]?.path}`,
      banner2:`${process.env.baseURL}/${files?.banner2[0]?.path}`,
      banner3:`${process.env.baseURL}/${files?.banner3[0]?.path}`,
     }
  

    await admin.save();

    res.status(201).send({
      message: "Customer banner images created successfully",
      Banners:admin.CustomerbannerImgs,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const UpdateCustomerBannerImg = async (req, res) => {
  const files = req.files;

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

    const updatedBanners = {
      banner1: files?.banner1 ? `${process.env.baseURL}/${files.banner1[0].path}` : admin.CustomerbannerImgs.banner1,
      banner2: files?.banner2 ? `${process.env.baseURL}/${files.banner2[0].path}` : admin.CustomerbannerImgs.banner2,
      banner3: files?.banner3 ? `${process.env.baseURL}/${files.banner3[0].path}` : admin.CustomerbannerImgs.banner3,
    };

    admin.CustomerbannerImgs = updatedBanners;

    await admin.save();

    res.status(200).send({
      message: "Customer banner images updated successfully",
      Banners: admin.CustomerbannerImgs,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};

const CreateVendorBannerImg = async (req, res) => {
  const files = req.files;

  if (!files?.banner1 ||!files?.banner2 || !files?.banner3 ) {
    return res.status(400).send({ message: "Please upload all three images" });
  }

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

     admin.VendorbannerImgs ={
      banner1:`${process.env.baseURL}/${files?.banner1[0]?.path}`,
      banner2:`${process.env.baseURL}/${files?.banner2[0]?.path}`,
      banner3:`${process.env.baseURL}/${files?.banner3[0]?.path}`,
     }
  

    await admin.save();

    res.status(201).send({
      message: "Vendor banner images created successfully",
      Banners:admin.VendorbannerImgs,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};
  
const UpdateVendorBannerImg = async (req, res) => {
  const files = req.files;

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

    const updatedBanners = {
      banner1: files?.banner1 ? `${process.env.baseURL}/${files.banner1[0].path}` : admin.CustomerbannerImgs.banner1,
      banner2: files?.banner2 ? `${process.env.baseURL}/${files.banner2[0].path}` : admin.CustomerbannerImgs.banner2,
      banner3: files?.banner3 ? `${process.env.baseURL}/${files.banner3[0].path}` : admin.CustomerbannerImgs.banner3,
    };

    admin.VendorbannerImgs = updatedBanners;

    await admin.save();

    res.status(200).send({
      message: "vendor banner images updated successfully",
      Banners: admin.VendorbannerImgs,
    });
  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
};



const adminReply = async (req, res) => {
  const { customerId, adminId, content } = req.body;

  if(!customerId || !adminId || !content){
    return res.status(400).send({message:"Please fill all required fields"})
  }

  try {
    const chat = await customerChat.findOne({ customer: customerId, admin: adminId });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const message = new customerMessage({
      sender: adminId,
      receiver: customerId,
      content,
      senderModel: 'admin', 
      receiverModel: 'customers' 
    });

    await message.save();

    chat.messages.push(message._id);
    chat.lastUpdated = new Date();

    await chat.save();

    return res.status(200).json({ message: 'Reply sent customer', chat });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

const getAllCustomerChats = async (req, res) => {
  const { adminId } = req.params;

  try {
    const chats = await customerChat.find({ admin: adminId })
      .populate('customer', 'userName email') 
      .populate({
        path: 'messages', 
        options: { sort: { timestamp: -1 }, limit: 1 }, 
      })
      .sort({ lastUpdated: -1 }); 

    const formattedChats = chats.map(chat => ({
      customer: chat.customer, 
      lastMessage: chat.messages[0]?.content || 'No messages yet', 
      lastMessageTime: chat.messages[0]?.timestamp || null, 
    }));

    return res.status(200).json({ success: true, chats: formattedChats });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};


const getCustomerChatHistory = async (req, res) => {
  const { customerId, adminId } = req.body;

if(!customerId || !adminId) {
  return res.status(400).send({message:"Please fill all required fields"})
}

  try {
    const chat = await customerChat.findOne({ customer: customerId, admin: adminId })
      .populate('messages')
      .populate('customer', 'name email');
 
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    return res.status(200).json({ chat });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

const adminReplyToVendor = async (req, res) => {
  const { vendorId, adminId, content } = req.body;

  if(!vendorId || !adminId || !content){
    return res.status(400).send({message:"Please fill all required fields"})
  }

  try {
    const chat = await vendorChat.findOne({ vendor: vendorId, admin: adminId });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const message = new vendorMessage({
      sender: adminId,
      receiver: vendorId,
      content,
      senderModel: 'admin', 
      receiverModel: 'Vendors' 
    });

    await message.save();

    chat.messages.push(message._id);
    chat.lastUpdated = new Date();

    await chat.save();

    return res.status(200).json({ message: 'Reply sent to vendor', chat });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

const getAllVendorChats = async (req, res) => {
  const { adminId } = req.params;

  try {
    const chats = await vendorChat.find({ admin: adminId })
      .populate('vendor', 'userName email') 
      .populate({
        path: 'messages', 
        options: { sort: { timestamp: -1 }, limit: 1 }, 
      })
      .sort({ lastUpdated: -1 }); 

    const formattedChats = chats.map(chat => ({
      vendor: chat.vendor, 
      lastMessage: chat.messages[0]?.content || 'No messages yet', 
      lastMessageTime: chat.messages[0]?.timestamp || null, 
    }));

    return res.status(200).json({ success: true, chats: formattedChats });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
};

const getVendorChatHistory = async (req, res) => {
  const { vendorId, adminId } = req.body;

if(!vendorId || !adminId) {
  return res.status(400).send({message:"Please fill all required fields"})
}

  try {
    const chat = await vendorChat.findOne({ vendor: vendorId, admin: adminId })
      .populate('messages')
      .populate('vendor', 'name email');
 
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    return res.status(200).json({ chat });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};



module.exports = {
  passengersVehicleApproval,
  createAdmin,
  login,
  getAllPendingVehicles,
  getAllApprovedVehicles,
  deleteVehicle,
  getAllVehicles,
  getALLBookings,
  cancelBookingByAdmin,
  getALLCompletedBookings,
  getALLCancelledBookings,
  CreateCustomerBannerImg,
  UpdateCustomerBannerImg,
  CreateVendorBannerImg,
  UpdateVendorBannerImg,
adminReply, getAllCustomerChats,
  getCustomerChatHistory,
  adminReplyToVendor,
  getAllVendorChats,
  getVendorChatHistory
};
 