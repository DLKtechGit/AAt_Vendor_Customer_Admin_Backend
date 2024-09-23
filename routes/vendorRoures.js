const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

const vendor = require("../controllers/vendor");

const router = express.Router();

// router.post('/registerVendorWithCar',vendor.registerVendorWithCar)
router.post("/vendorSignup", vendor.vendorSignup);
router.post("/vendorLogin", upload.none(), vendor.vendorLogin);
router.post("/forgotPassword", vendor.forgotPassword);
router.post("/validatePin", vendor.validatePin);
router.post("/resetPassword", vendor.resetPassword);
router.post("/getVendorById", auth.validate, vendor.getVendorById);
router.get("/getAllVendors", auth.validate, vendor.getAllVendors);
router.post("/editVendorProfile", auth.validate, vendor.editVendorProfile);
router.post("/editPassword", auth.validate, vendor.editPassword),
  router.get(
    "/getAllVehiclesByVendor/:vendorId",
    vendor.getAllVehiclesByVendor
  ),
  router.get("/getVendorCars/:vendorId", vendor.getVendorAuots),
  router.get("/getVendorAuots/:vendorId", vendor.getVendorAuots);
router.post(
  "/editCar/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  auth.validate,
  vendor.editCar
);

router.post(
  "/createCar",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.createCar
);

router.post(
  "/recreateCar",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.recreateCar
);

router.post(
  "/createAuto",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.createAuto
);

router.post(
  "/recreateAuto",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.recreateAuto
);

router.post(
  "/editAuto/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.editAuto
);

router.post(
  "/createVan",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.createVan
);

router.post(
  "/recreateVan",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.recreateVan
);

router.get("/getVendorVans/:vendorId", vendor.getVendorVans);

router.post(
  "/editVan/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.editVan
);

router.post(
  "/createbus",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.createbus
);

router.post(
  "/recreatebus",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 1 },
    { name: "ownerDrivingLicense", maxCount: 1 },
    { name: "vehicleInsurance", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  vendor.recreatebus
);

router.get("/getVendorBus/:vendorId", vendor.getVendorBus);

router.post(
    "/editBus/:vendorId/:vehicleId",
    upload.fields([
      { name: "vehicleImages", maxCount: 5 },
      { name: "ownerImage", maxCount: 1 },
      { name: "ownerAdharCard", maxCount: 1 },
      { name: "ownerDrivingLicense", maxCount: 1 },
      { name: "vehicleInsurance", maxCount: 1 },
      { name: "vehicleRC", maxCount: 1 },
    ]),
    vendor.editBus
  );  

  router.post(
    "/createTruck",
    upload.fields([
      { name: "vehicleImages", maxCount: 5 },
      { name: "ownerImage", maxCount: 1 },
      { name: "ownerAdharCard", maxCount: 1 },
      { name: "ownerDrivingLicense", maxCount: 1 },
      { name: "vehicleInsurance", maxCount: 1 },
      { name: "vehicleRC", maxCount: 1 },
    ]),
    vendor.createTruck
  );
 
  router.post( 
    "/recreateTruck",
    upload.fields([
      { name: "vehicleImages", maxCount: 5 },
      { name: "ownerImage", maxCount: 1 },
      { name: "ownerAdharCard", maxCount: 1 },
      { name: "ownerDrivingLicense", maxCount: 1 },
      { name: "vehicleInsurance", maxCount: 1 },
      { name: "vehicleRC", maxCount: 1 },
    ]),
    vendor.recreateTruck
  );

  router.get("/getVendorTruck/:vendorId", vendor.getVendorTruck);

  router.post(
    "/editTruck/:vendorId/:vehicleId",
    upload.fields([
      { name: "vehicleImages", maxCount: 5 },
      { name: "ownerImage", maxCount: 1 },
      { name: "ownerAdharCard", maxCount: 1 },
      { name: "ownerDrivingLicense", maxCount: 1 },
      { name: "vehicleInsurance", maxCount: 1 },
      { name: "vehicleRC", maxCount: 1 },
    ]),
    vendor.editTruck
  );   
         
  router.get('/getBookingsByVendorId/:vendorId',vendor.getBookingsByVendorId)
  router.post('/vendorBookingApproval',upload.none(),vendor.vendorBookingApproval)
  router.post('/storeFCMTokenToVendor',upload.none(),vendor.storeFCMTokenToVendor)
  router.post('/vendorCompleteRide',upload.none(),vendor.vendorCompleteRide) 

  router.post('/getVendorBookingsByMonth',upload.none(),vendor.getVendorBookingsByMonth)
  router.post('/getVendorBookingsByMonthAndWeek',upload.none(),vendor.getVendorBookingsByMonthAndWeek)
   
  

module.exports = router;
 