const customerModel = require("../models/customer");
const auth = require("../middleware/auth");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const vendorModel = require("../models/vendor");
const bookingModel = require("../models/booking");
const mongoose = require("mongoose");
const admin = require("../firebase");
const {customerChat , customerMessage} = require("../models/chatandMessageForCustomer");
// const customerMessage = require("../models/customerMessage");


const signup = async (req, res) => {
  const { userName, email, phoneNumber, address, password } = req.body;

  if (!userName || !email || !phoneNumber || !address || !password) {
    return res.status(400).send({
      message: "All fields (userName, email, and password) are required",
    });
  }

  try {
    let user = await customerModel.findOne({ email });

    if (!user) {
      const hashedPassword = await auth.hashPassword(password);
      const customerData = await customerModel.create({
        ...req.body,
        password: hashedPassword,
      });

      res
        .status(201)
        .send({ message: "Customer signup successfully", customerData });
    } else {
      res
        .status(409)
        .send({ message: `User with email ${email} already exists` });
    }
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
      .send({ message: "All fields (email, and password) are required" });
  }

  try {
    let user = await customerModel.findOne({ email: req.body.email });
    if (user) {
      let hashCompares = await auth.hashCompare(
        req.body.password,
        user.password
      );

      if (hashCompares) {
        let token = await auth.createToken({
          id: user._id,
          userName: user.userName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          address: user.address,
        });

        let userData = await customerModel.findOne(
          { email: req.body.email },
          {
            _id: 1,
            userName: 1,
            email: 1,
            createdAt: 1,
            phoneNumber: 1,
            address: 1,
          }
        );
        res.status(201).send({
          message: "Login Successfully",
          token,
          userData,
        });
      } else {
        res.status(401).send({
          massage: "Invalid Passowrd",
        });
      }
    } else {
      res.status(404).send({
        message: `Account with ${req.body.email} does not exist`,
      });
    }
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

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
    const user = await customerModel.findOne({ email });
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
  const { email, resetPin } = req.body;

  if (!resetPin || !email) {
    return res
      .status(400)
      .send({ message: " Please fill all required fields" });
  }

  try {
    const user = await customerModel.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: `Email is not exist` });
    }

    if (user.resetPin !== resetPin) {
      return res.status(400).send({ message: "Invalid Pin" });
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
  const { email, resetPin, newPassword, confirmPassword } = req.body;

  if (!email || !resetPin || !newPassword || !confirmPassword) {
    return res.status(400).send({ message: "Fill the all required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .send({ message: "New password and confirm password do not match" });
  }

  try {
    const user = await customerModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.resetPin !== resetPin) {
      return res
        .status(400)
        .send({ message: "session expired please regenerate the otp" });
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

const getCustomerById = async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) {
    return res.status(400).send({ message: "customerId is required" });
  }
  try {
    const user = await customerModel.findById({ _id: customerId });
    if (!user) {
      return res.status(404).send({ message: "Customer not found" });
    }
    return res
      .status(200)
      .send({ message: "Customer fetched successfully", user });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await customerModel.find();

    if (customers.length === 0) {
      return res.status(404).send({ message: "No customers found" });
    }

    return res
      .status(200)
      .send({ message: "Customers fetched successfully", customers });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editCustomerProfile = async (req, res) => {
  const { _id, userName, email, phoneNumber, address } = req.body;

  if (!userName || !email || !phoneNumber || !address) {
    return res.status(400).send({ message: "Fill all required fields" });
  }
  try {
    const user = await customerModel.findById({ _id: _id });
    if (!user) {
      return res.status(400).send({ message: "Customer not found" });
    }

    (user.userName = userName),
      (user.email = email),
      (user.phoneNumber = phoneNumber),
      (user.address = address);

    await user.save();

    return res
      .status(201)
      .send({ message: "Customer profile  updated successfully", user });
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
    const user = await customerModel.findById(_id);
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

const AvailableCarsforBooking = async (req, res) => {
  try {
    const { tripType, pickUpDate, returnDate } = req.body;

    if (!pickUpDate || !tripType) {
      return res
        .status(400)
        .send({ message: "pickUpDate and returnDate is required" });
    }

    if (tripType === "Round Trip" && !returnDate) {
      return res.status(400).send({ message: "Return date is required" });
    }

    const formattedPickUpDate = new Date(pickUpDate);

    if (isNaN(formattedPickUpDate.getTime())) {
      return res.status(400).send({ message: "Invalid pickUpDate format" });
    }
    const vendors = await vendorModel.find();

    const availableCarsList = [];

    vendors.forEach((vendor) => {
      const availableCars =
        vendor.vehicles?.cars.filter((car) => {
          const carReturnDate = new Date(car.returnDate);

          return (
            (car.vehicleApprovedByAdmin === "approved" &&
              car.vehicleAvailable === "no" &&
              formattedPickUpDate > carReturnDate) ||
            (car.vehicleApprovedByAdmin === "approved" &&
              car.vehicleAvailable === "yes")
          );
        }) || [];

      availableCars.forEach((car) => {
        availableCarsList.push({
          vendorId: vendor._id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorPhoneNumber: vendor.phoneNumber,
          vendorAddress: vendor.address,
          carDetails: car,
        });
      });
    });

    if (availableCarsList.length === 0) {
      return res
        .status(404)
        .send({ message: "No available cars found for the given date" });
    }

    res.status(200).send({
      message: "Available cars retrieved successfully",
      availableCars: availableCarsList,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const availableAutosforBooking = async (req, res) => {
  try {
    const { tripType, pickUpDate, returnDate } = req.body;

    if (!pickUpDate || !tripType) {
      return res
        .status(400)
        .send({ message: "pickUpDate and returnDate is required" });
    }

    if (tripType === "Round Trip" && !returnDate) {
      return res.status(400).send({ message: "Return date is required" });
    }

    const formattedPickUpDate = new Date(pickUpDate);

    if (isNaN(formattedPickUpDate.getTime())) {
      return res.status(400).send({ message: "Invalid pickUpDate format" });
    }
    const vendors = await vendorModel.find();

    const availableAutosList = [];

    vendors.forEach((vendor) => {
      const availableAutos =
        vendor.vehicles?.autos.filter((auto) => {
          const carReturnDate = new Date(auto.returnDate);

          return (
            auto.vehicleApprovedByAdmin === "approved" &&
            auto.vehicleAvailable === "yes"
          );
        }) || [];

      availableAutos.forEach((auto) => {
        availableAutosList.push({
          vendorId: vendor._id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorPhoneNumber: vendor.phoneNumber,
          vendorAddress: vendor.address,
          carDetails: auto,
        });
      });
    });

    if (availableAutosList.length === 0) {
      return res
        .status(404)
        .send({ message: "No available autos found for the given date" });
    }

    res.status(200).send({
      message: "Available autos retrieved successfully",
      availableAutos: availableAutosList,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const AvailableVansforBooking = async (req, res) => {
  try {
    const { tripType, pickUpDate, returnDate } = req.body;

    if (!pickUpDate || !tripType) {
      return res
        .status(400)
        .send({ message: "pickUpDate and returnDate is required" });
    }

    if (tripType === "Round Trip" && !returnDate) {
      return res.status(400).send({ message: "Return date is required" });
    }

    const formattedPickUpDate = new Date(pickUpDate);

    if (isNaN(formattedPickUpDate.getTime())) {
      return res.status(400).send({ message: "Invalid pickUpDate format" });
    }
    const vendors = await vendorModel.find();

    const availableVansList = [];

    vendors.forEach((vendor) => {
      const availableVans =
        vendor.vehicles?.vans.filter((van) => {
          const vanReturnDate = new Date(van.returnDate);

          return (
            (van.vehicleApprovedByAdmin === "approved" &&
              van.vehicleAvailable === "no" &&
              formattedPickUpDate > vanReturnDate) ||
            (van.vehicleApprovedByAdmin === "approved" &&
              van.vehicleAvailable === "yes")
          );
        }) || [];

      availableVans.forEach((van) => {
        availableVansList.push({
          vendorId: vendor._id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorPhoneNumber: vendor.phoneNumber,
          vendorAddress: vendor.address,
          carDetails: van,
        });
      });
    });

    if (availableVansList.length === 0) {
      return res
        .status(404)
        .send({ message: "No available vans found for the given date" });
    }

    res.status(200).send({
      message: "Available vans retrieved successfully",
      availableVans: availableVansList,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const AvailableBusesforBooking = async (req, res) => {
  try {
    const { tripType, pickUpDate, returnDate } = req.body;

    if (!pickUpDate || !tripType) {
      return res
        .status(400)
        .send({ message: "pickUpDate and returnDate is required" });
    }

    if (tripType === "Round Trip" && !returnDate) {
      return res.status(400).send({ message: "Return date is required" });
    }

    const formattedPickUpDate = new Date(pickUpDate);

    if (isNaN(formattedPickUpDate.getTime())) {
      return res.status(400).send({ message: "Invalid pickUpDate format" });
    }
    const vendors = await vendorModel.find();

    const availableBusesList = [];

    vendors.forEach((vendor) => {
      const availablebuses =
        vendor.vehicles?.buses.filter((bus) => {
          const busReturnDate = new Date(bus.returnDate);

          return (
            (bus.vehicleApprovedByAdmin === "approved" &&
              bus.vehicleAvailable === "no" &&
              formattedPickUpDate > busReturnDate) ||
            (bus.vehicleApprovedByAdmin === "approved" &&
              bus.vehicleAvailable === "yes")
          );
        }) || [];

      availablebuses.forEach((bus) => {
        availableBusesList.push({
          vendorId: vendor._id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorPhoneNumber: vendor.phoneNumber,
          vendorAddress: vendor.address,
          carDetails: bus,
        });
      });
    });

    if (availableBusesList.length === 0) {
      return res
        .status(404)
        .send({ message: "No available buses found for the given date" });
    }

    res.status(200).send({
      message: "Available buses retrieved successfully",
      availableBuses: availableBusesList,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const AvailableTrucksforBooking = async (req, res) => {
  try {
    const { tripType, pickUpDate, returnDate } = req.body;

    if (!pickUpDate || !tripType) {
      return res
        .status(400)
        .send({ message: "pickUpDate and returnDate is required" });
    }

    if (tripType === "Round Trip" && !returnDate) {
      return res.status(400).send({ message: "Return date is required" });
    }

    const formattedPickUpDate = new Date(pickUpDate);

    if (isNaN(formattedPickUpDate.getTime())) {
      return res.status(400).send({ message: "Invalid pickUpDate format" });
    }
    const vendors = await vendorModel.find();

    const availableTruksList = [];

    vendors.forEach((vendor) => {
      const availableTrucks =
        vendor.vehicles?.trucks.filter((truck) => {
          const truckReturnDate = new Date(truck.returnDate);

          return (
            (truck.vehicleApprovedByAdmin === "approved" &&
              truck.vehicleAvailable === "no" &&
              formattedPickUpDate > truckReturnDate) ||
            (truck.vehicleApprovedByAdmin === "approved" &&
              truck.vehicleAvailable === "yes")
          );
        }) || [];

      availableTrucks.forEach((truck) => {
        availableTruksList.push({
          vendorId: vendor._id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorPhoneNumber: vendor.phoneNumber,
          vendorAddress: vendor.address,
          carDetails: truck,
        });
      });
    });

    if (availableTruksList.length === 0) {
      return res
        .status(404)
        .send({ message: "No available trucks found for the given date" });
    }

    res.status(200).send({
      message: "Available trucks retrieved successfully",
      availableTrucks: availableTruksList,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const AvailableVehiclesForBooking = async (req, res) => {
  try {
    const { tripType, pickUpDate, returnDate, vehicleType } = req.body;

    if (!pickUpDate || !tripType || !vehicleType) {
      return res.status(400).send({
        message: "pickUpDate, tripType, and vehicleType are required",
      });
    }

    if (tripType === "Round Trip" && !returnDate) {
      return res.status(400).send({ message: "Return date is required" });
    }

    const formattedPickUpDate = new Date(pickUpDate);
    if (isNaN(formattedPickUpDate.getTime())) {
      return res.status(400).send({ message: "Invalid pickUpDate format" });
    }

    const validVehicleTypes = ["cars", "vans", "buses", "autos", "trucks"];
    if (!validVehicleTypes.includes(vehicleType)) {
      return res.status(400).send({ message: "Invalid vehicleType provided" });
    }

    const vendors = await vendorModel.find();
    const availableVehiclesList = [];

    vendors.forEach((vendor) => {
      let availableVehicles;

      if (vehicleType === "autos" || vehicleType === "trucks") {
        availableVehicles =
          vendor.vehicles?.[vehicleType].filter((vehicle) => {
            return (
              vehicle.vehicleApprovedByAdmin === "approved" &&
              vehicle.vehicleAvailable === "yes"
            );
          }) || [];
      } else {
        availableVehicles =
          vendor.vehicles?.[vehicleType].filter((vehicle) => {
            const vehicleReturnDate = new Date(vehicle.returnDate);

            return (
              (vehicle.vehicleApprovedByAdmin === "approved" &&
                vehicle.vehicleAvailable === "no" &&
                formattedPickUpDate > vehicleReturnDate) ||
              (vehicle.vehicleApprovedByAdmin === "approved" &&
                vehicle.vehicleAvailable === "yes")
            );
          }) || [];
      }

      availableVehicles.forEach((vehicle) => {
        availableVehiclesList.push({
          vendorId: vendor._id,
          vendorName: vendor.name,
          vendorEmail: vendor.email,
          vendorPhoneNumber: vendor.phoneNumber,
          vendorAddress: vendor.address,
          vehicleDetails: vehicle,
        });
      });
    });

    if (availableVehiclesList.length === 0) {
      return res.status(404).send({
        message: `No available ${vehicleType} found for the given date`,
      });
    }

    res.status(200).send({
      message: `Available ${vehicleType} retrieved successfully`,
      availableVehicles: availableVehiclesList,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const bookcar = async (req, res) => {
  const {
    customerId,
    vendorId,
    vehicleId,
    pickupLocation,
    dropLocation,
    pickupDate,
    returnDate,
    totalKm,
    tripType,
    advanceAmount,
    receiversName,
    receiversNumber,
  } = req.body;

  if (
    !vendorId ||
    !customerId ||
    !vehicleId ||
    !pickupLocation ||
    !dropLocation ||
    !pickupDate ||
    !tripType ||
    !totalKm
  ) {
    return res.status(400).send({ message: "Please fill all required field" });
  }
  try {
    const customer = await customerModel.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "vendor not found" });
    }

    if (tripType === "Round Trip") {
      if (!returnDate) {
        return res.status(400).send({ message: "Return date is required" });
      }
    }

    const vehicleCategories = Object.values(vendor.vehicles);

    let foundVehicle = null;

    for (const category of vehicleCategories) {
      foundVehicle = category.find(
        (vehicle) => vehicle._id.toString() === vehicleId
      );

      if (foundVehicle) {
        break;
      }
    }
    if (!foundVehicle) {
      return res.status(404).send({ message: "vehicle not found" });
    }

    (foundVehicle.returnDate = returnDate),
      (foundVehicle.vehicleAvailable = "no");

    await vendor.save();

    const newBookings = new bookingModel({
      pickupLocation,
      dropLocation,
      pickupDate,
      returnDate,
      totalKm,
      advanceAmount,
      receiversName,
      receiversNumber,
      customer: {
        customerName: customer.userName,
        customerEmail: customer.email,
        customerPhoneNumber: customer.phoneNumber,
        customerAddress: customer.address,
        customerId: customer._id,
      },
      vehicleDetails: {
        vendorId: vendor._id,
        vendorName: vendor.userName,
        vendorPhoneNumber: vendor.phoneNumber,
        vendorAddress: vendor.address,
        vendorEmail: vendor.email,
        foundVehicle,
      },
    });

    await newBookings.save();
    const newMessage = {
      title: "New Booking Request",
      description: `Dear ${vendor.userName}, 
      
      A customer named ${customer.userName} has booked your ${
        foundVehicle.subCategory
      } (Plate Number: ${
        foundVehicle.licensePlate
      }) for a journey from ${pickupLocation} to ${dropLocation}. The pickup is scheduled for ${new Date(
        pickupDate
      ).toLocaleDateString()}.
      
      Please review the booking details .`,
    };

    vendor.messages.push(newMessage);
    await vendor.save();

    if (vendor.fcmToken) {
      const message = {
        notification: {
          title: "New Booking Request",
          body: newMessage.description,
        },
        token: vendor.fcmToken,
      };

      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Successfully sent notification:", response);
        })
        .catch((error) => {
          console.log("Error sending notification:", error);
        });
    }

    res
      .status(201)
      .send({ message: "Vehicle booked successfully", newBookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getBookingsByCustomerId = async (req, res) => {
  const { customerId } = req.params;

  if (!customerId) {
    return res.status(400).send({ message: "Customer ID is required" });
  }

  try {
    const bookings = await bookingModel.find({
      "customer.customerId": new mongoose.Types.ObjectId(customerId),
    });

    if (bookings.length === 0) {
      return res
        .status(404)
        .send({ message: "No bookings found for this customer" });
    }

    res
      .status(200)
      .send({ message: "Bookings retrieved successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const cancelBookingByCustomer = async (req, res) => {
  const { bookingId, customerId, reason } = req.body;

  if (!bookingId || !customerId || !reason) {
    return res.status(400).send({ message: "Fill all  required fields" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    const customer = await customerModel.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found" });
    }

    if (booking.customer.customerId.toString() !== customerId) {
      return res
        .status(403)
        .send({ message: "You are not authorized to cancel this booking" });
    }

    const vendor = await vendorModel.findById(booking.vehicleDetails.vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const currentDateTime = new Date();
    const pickupDateTime = new Date(booking.pickupDate);

    const timeDifferenceInHours =
      (pickupDateTime - currentDateTime) / (1000 * 60 * 60);

    if (timeDifferenceInHours < 24) {
      return res.status(403).send({
        message:
          "You can only cancel the booking before 24 hours of the pickup time.",
      });
    }

    const currentMonthCancellations = customer.cancellationHistory.filter(
      (cancellation) => {
        const cancellationDate = new Date(cancellation.date);
        const now = new Date();
        return (
          cancellationDate.getMonth() === now.getMonth() &&
          cancellationDate.getFullYear() === now.getFullYear()
        );
      }
    );

    if (currentMonthCancellations.length >= 2) {
      const penaltyAmount = 50;
      customer.penaltyAmount = customer.penaltyAmount
        ? customer.penaltyAmount + penaltyAmount
        : penaltyAmount;

      await customer.save();

      const penaltyMessage = `You have cancelled more than 2 bookings this month. A penalty of $${penaltyAmount} has been applied to your account.`;
      customer.messages.push({
        title: "Cancellation Penalty",
        description: penaltyMessage,
      });
    }

    customer.cancellationHistory.push({ date: new Date() });

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
      tripStatus: { $nin: ["ongoing", "completed", "cancelled"] } 
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

    booking.customerCancelled = true;
    booking.bookingStatus = "cancelled";
    booking.customerCancelledReason = reason;
    booking.tripStatus = "cancelled";
    await booking.save();

    const cancellationMessage = {
      title: "Booking Cancelled",
      description: `Dear ${vendor.userName}, the booking for the ${foundVehicle.subCategory} , ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been cancelled by the customer. Reason: ${reason}`,
    };
    vendor.messages.push(cancellationMessage);
    await vendor.save();

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



const storeFCMTokenToCustomer = async (req, res) => {
  const { customerId, fcmToken } = req.body;

  if (!customerId || !fcmToken) {
    return res
      .status(400)
      .send({ message: "customer ID and FCM token are required" });
  }

  try {
    const customer = await customerModel.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "customer not found" });
    }

    customer.fcmToken = fcmToken;
    await customer.save();

    res
      .status(200)
      .send({ message: "FCM token stored successfully", customer });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const CustomerSendMessage = async (req, res) => {
  const { customerId, adminId, content } = req.body;

  if(!customerId || !adminId  || !content){
    return res.status(400).send({message:"Please fill the all required fields"})
  }

  try {
    let chat = await customerChat.findOne({ customer: customerId, admin: adminId });

    if (!chat) {
      chat = new customerChat({
        customer: customerId,
        admin: adminId
      });
      await chat.save(); 
    }

    const message = new customerMessage({
      sender: customerId,
      receiver: adminId,
      content,
      senderModel: 'customers', 
      receiverModel: 'admin'    
    });

    await message.save();

    chat.messages.push(message._id);
    chat.lastUpdated = new Date();

    await chat.save();

    return res.status(200).json({ message: 'Message sent', chat });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
 

module.exports = {
  signup, 
  login,
  forgotPassword,
  validatePin,
  resetPassword,
  getCustomerById,
  getAllCustomers,
  editCustomerProfile,
  editPassword,
  AvailableCarsforBooking,
  bookcar,
  getBookingsByCustomerId,
  cancelBookingByCustomer,
  storeFCMTokenToCustomer,
  availableAutosforBooking,
  AvailableVansforBooking,
  AvailableVehiclesForBooking,
  AvailableBusesforBooking,
  AvailableTrucksforBooking,
  CustomerSendMessage
};
