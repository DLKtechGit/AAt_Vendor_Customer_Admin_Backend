const express = require('express')
const admin = require('../controllers/admin')
const auth = require("../middleware/auth")
const upload = require('../middleware/uploadMiddleware')

const router = express.Router()

router.post('/createAdmin',upload.none(),admin.createAdmin)
router.post('/login',upload.none(),admin.login)
router.post('/passengersVehicleApproval',auth.validate , auth.adminGaurd,upload.none(),admin.passengersVehicleApproval)
router.get('/getAllPendingVehicles',auth.validate , auth.adminGaurd ,upload.none(),admin.getAllPendingVehicles)
router.get('/getAllApprovedVehicles',auth.validate , auth.adminGaurd ,upload.none(),admin.getAllApprovedVehicles)
router.delete('/deleteVehicle/:vendorId/:vehicleId',auth.validate , auth.adminGaurd ,upload.none(),admin.deleteVehicle)
router.get('/getAllVehicles',auth.validate,auth.adminGaurd,admin.getAllVehicles)
router.get('/getALLBookings',auth.validate, auth.adminGaurd, admin.getALLBookings)
  

module.exports = router 