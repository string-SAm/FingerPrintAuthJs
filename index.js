const express=require('express')
const crypto=require('node:crypto')
const {generateRefgistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse}=require('@simplewebauthn/server')
const { error } = require('node:console')
//const { error } = require('node:console')

if(!globalThis.crypto){
    globalThis.crypto=crypto
}

const PORT=3000
const app=express()

app.use(express.static('./public'))
app.use(express.json())

const userStore={}
const challengeStore={}

app.post('/register',(req,res)=>{
    const {username,password}=req.body
    const id=`${Date.now()}`

    const user={
        id,
        username,
        password
    }

    userStore[id]=user

    console.log(`Register Succesfull`, userStore[id]);

    return res.json({id})
})

app.post('register-challenge',async(req,res)=>{
    const {userId}=req.body

    if(!userStore[userId]) return res.status(404).json({error:`user not found`})

    const user=userStore[userId]

    const challengePayload=await generateRefgistrationOptions({
        rpId:'localhost',
        rpName:'Swayam Localhost Machine',
        userName:user.userName
    })

    challengeStore[userId]=challengePayload.challengePayload

    return res.json({options:challengePayload})
})

app.post('register-verify',async(req,res)=>{
    const {userId,cred}=req.body

    if(!userStore[userId])return res.status(404).json({error:'user not found'})

    const user=userStore[userId]
    const challenge=challengeStore[userId]

    const verificationResult=await verifyRegistrationResponse({
        expectedChallenge:challenge,
        expectedOrigin:'http://localhost:3000',
        expectedRPID:'localhost',
        response:cred
    })
    if(!verificationResult.verified) return res.json({error:'could not verify'})
    userStore[userId].passkey=verificationResult.registrationInfo

    return res.json({verified:true})
})

app.post('/login-challenge',async(req,res)=>{
    const {userId}=req.body
    if(!userStore[userId]) return res.status(404).json({error:'user not found'})

    const opts=await generateAuthenticationOptions({
        rpID:'localhost',
    })
    challengeStore[userId]=opts.challenge

    return res.json({options:opts})
})

app.post('/login-verify',async(req,res)=>{
    const {userId,cred}=req.body
    if(!userStore[userId]) return res.json(404).json({error:'user not found'})
    const user=userStore[userId]
    const challenge=challengeStore[userId]

    const result=await verifyAuthenticationResponse({
        expectedChallenge:challenge,
        expectedOrigin:'http://localhost:3000',
        expectedRPID:'localhost',
        response:cred,
        authenticator:user.passkey
    })

    if(!result.verified) return res.json({error:'someting went wrong'})

    return res.json({success:true,userId})
})

app.listen(PORT,()=>console.log(`Server satrted on Port: ${PORT}`))

