const axios = require('axios')
const BN = require('bn.js')
const { ethers } = require("ethers");
const ORACLE_ADDRESS = ""
const ORACLE_ABI = ""
const CALLER_ADDRESS = ""
const CALLER_ABI = ""
const PROVIDER = process.env.PROVIDER || "HTTP://127.0.0.1:7545"
//const OWNER_ADDRESS = "0x38f40BDdE4F6A8Fa276Ae1B3A7960a42F4bF00cb"
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3
const MAX_RETRIES = process.env.MAX_RETRIES || 5

var pendingRequests = []


async function getOracleContract () {
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER)
    return new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
  }
  
  async function filterEvents (oracleContract) {
    let GetValidateVAT = await oracleContract.filters.GetValidateVAT()
    oracleContract.on(GetValidateVAT, (from, to, amount, event) => {
        console.log(event);
        await addRequestToQueue(event)
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
      await processRequest(oracleContract, req.id, req.callerAddress, req.vatNumber)
      processedRequests++
    }
  }
  
  async function processRequest (oracleContract, id, callerAddress, vatNumber) {
    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        const response = await validateVATNumber(vatNumber)
        await setValidateVAT(oracleContract, callerAddress, ethPrice, id, response.valid, response.country.name)
        return
      } catch (error) {
        if (retries === MAX_RETRIES - 1) {
          await setValidateVAT(oracleContract, callerAddress, id, false, "")
          return
        }
        retries++
      }
    }
  }

  async function validateVATNumber(vatNumber){
    const resp = await axios({
      url: 'https://vat.abstractapi.com/v1/validate/',
      params: {
        api_key: "7b34b25979f543c28f0f18f4dd8975b0",
        vat_number: vatNumber
      },
      method: 'get'
    })
    return resp.data
  }
  
  async function setValidateVAT (oracleContract, callerAddress, id, confirmed, country) {
    const idInt = new BN(parseInt(id))
    try {//bool _confirmed, string calldata _country, address _callerAddress, uint256 _id
      await oracleContract.setValidateVAT(confirmed, country, callerAddress, idInt.toString())
    } catch (error) {
      console.log('Error encountered while calling setValidateVAT.')
    }
  }
  
  async function init () {
    const oracleContract = await getOracleContract()
    filterEvents(oracleContract)
    return { oracleContract }
  }
  
  (async () => {
    const { oracleContract } = await init()
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER)
    const callerContract = new ethers.Contract(CALLER_ADDRESS, CALLER_ABI, provider);
    await callerContract.setOracleInstanceAddress(oracleAddress)
    setInterval(async () => {
      await processQueue(oracleContract)
    }, SLEEP_INTERVAL)
  })()