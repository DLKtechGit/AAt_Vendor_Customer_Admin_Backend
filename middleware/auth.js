const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const hashPassword = async(password)=>{
    let salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS))
    let hash = await bcrypt.hash(password,salt)
    return hash
}

const hashCompare = async(password,hash)=>{
    return await bcrypt.compare(password,hash)
}

const createToken = async(payload)=>{
    const token = await jwt.sign(payload,process.env.JWT_SECRET,{
        expiresIn:'1d'
    })
    return token
}

const decodeToken = async(token)=>{
    const payload = await jwt.decode(token)
    return payload
}

const validate = async(req,res,next)=>{
    let token = req.headers.authorization?.split(" ")[1]
    if(token)
    {   
        let payload = await decodeToken(token)
        console.log('payload',payload);
        
        req.headers.userId = payload.id 
        let currentTime = (+new Date())/1000
        if(currentTime<payload.exp){
            next()
        } 
        else{
            res.status(400).send({message:"Token Expired"})
        }
    }
    else
    {
        res.status(401).send({message:"Token Not Foud"})
    }
    
    }

    const adminGaurd = async(req,res,next)=>{
        let Token = req.headers.authorization?.split(" ")[1]
        if(Token){
          let payload = await decodeToken(Token)
        //   console.log('payload',payload);
          
          if(payload.role ==="admin"){
            next()
          }
          else{
            res.status(401).send({message:"Admin only acces"})
          }
        }
        else{
            res.status(401).send({message:"Token not found"})
        }
    }


module.exports = {
    hashPassword,
    hashCompare,
    createToken,
    validate,
    adminGaurd
}