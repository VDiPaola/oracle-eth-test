const axios = require('axios')
const BN = require('bn.js')
const { ethers } = require("ethers");
const ORACLE_ADDRESS = ""
const ORACLE_ABI = ""
const PROVIDER = process.env.PROVIDER || "HTTP://127.0.0.1:7545"
const OWNER_ADDRESS = process.env.OWNER_ADDRESS || "0x38f40BDdE4F6A8Fa276Ae1B3A7960a42F4bF00cb"
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3
const MAX_RETRIES = process.env.MAX_RETRIES || 5
const OracleJSON = require('./oracle/build/contracts/Oracle.json')
var pendingRequests = []


async function getOracleContract () {
    const provider = new ethers.providers.JsonRpcProvider("HTTP://127.0.0.1:7545")
    return new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
  }
  
  async function filterEvents (oracleContract) {
    let GetValidateVAT = await oracleContract.filters.GetValidateVAT()
    oracleContract.on(GetValidateVAT, (from, to, amount, event) => {
        console.log(event);
        //await addRequestToQueue(event)
    });
  
    let SetValidateVAT = await oracleContract.events.SetValidateVAT()
    oracleContract.on(SetValidateVAT, (from, to, amount, event) => {
        console.log(event);
    });
  }
  
  async function addRequestToQueue (event) {
    const callerAddress = event.returnValues.callerAddress
    const id = event.returnValues.id
    const vatNumber = event.returnValues.vatNumber
    pendingRequests.push({ vatNumber, callerAddress, id })
  }
  
  async function processQueue (oracleContract) {
    let processedRequests = 0
    while (pendingRequests.length > 0 && processedRequests < CHUNK_SIZE) {
      const req = pendingRequests.shift()
      await processRequest(oracleContract, req.id, req.callerAddress)
      processedRequests++
    }
  }
  
  async function processRequest (oracleContract, id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        const ethPrice = await retrieveLatestEthPrice()
        await setLatestEthPrice(oracleContract, callerAddress, ethPrice, id)
        return
      } catch (error) {
        if (retries === MAX_RETRIES - 1) {
          await setLatestEthPrice(oracleContract, callerAddress, '0', id)
          return
        }
        retries++
      }
    }
  }
  
  async function setLatestEthPrice (oracleContract, callerAddress, ethPrice, id) {
    ethPrice = ethPrice.replace('.', '')
    const multiplier = new BN(10**10, 10)
    const ethPriceInt = (new BN(parseInt(ethPrice), 10)).mul(multiplier)
    const idInt = new BN(parseInt(id))
    try {
      await oracleContract.methods.setLatestEthPrice(ethPriceInt.toString(), callerAddress, idInt.toString()).send({ from: OWNER_ADDRESS })
    } catch (error) {
      console.log('Error encountered while calling setLatestEthPrice.')
      // Do some error handling
    }
  }
  
  async function init () {
    const oracleContract = await getOracleContract()
    filterEvents(oracleContract)
    return { oracleContract }
  }
  
  (async () => {
    const { oracleContract } = await init()
    setInterval(async () => {
      await processQueue(oracleContract)
    }, SLEEP_INTERVAL)
  })()