import { CeramicClient } from '@ceramicnetwork/http-client';
import { DIDDataStore } from '@glazed/did-datastore';
import { DID } from 'dids';
import { ethers, Wallet } from 'ethers';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import KeyResolver from 'key-did-resolver';

const profileForm = document.getElementById("profileForm");
const walletBtn = document.getElementById("walletBtn");
const profileName = document.getElementById("profileName");
const profileGender = document.getElementById("profileGender");
const profileCountry = document.getElementById("profileCountry");
const submitBtn = document.getElementById("submitBtn");

walletBtn.innerHTML = "Connect Wallet";
profileName.innerHTML = "Name: ";
profileGender.innerHTML = "Gender: ";
profileCountry.innerHTML = "Country: ";

const ceramic = new CeramicClient("https://ceramic-clay.3boxlabs.com");

// TODO: put a private key here
const privateKey = "";

const aliases = {
  schemas: {
    basicProfile: "ceramic://k3y52l7qbv1frxt706gqfzmq6cbqdkptzk8uudaryhlkf6ly9vx21hqu4r6k1jqio",
  },
  definitions: {
    BasicProfile: "kjzl6cwe1jw145cjbeko9kil8g9bxszjhyde21ob8epxuxkaon1izyqsu8wgcic",
  },
  tiles: {},
};

const datastore = new DIDDataStore({ ceramic, model: aliases });

async function authenticateWithEthereum(provider, account) {
  const did = new DID({ provider, resolver: KeyResolver.getResolver() });
  await did.authenticate();

  console.log("did", did);

  ceramic.setDID(did);
}

const fromHexString = (hexString) => Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

async function auth() {
  const privateKeyBuffer = fromHexString(privateKey);
  console.log("privateKeyBuffer", privateKeyBuffer);
  const signKey = new ethers.utils.SigningKey(privateKeyBuffer);

  const publicKeyBuffer = fromHexString(signKey.publicKey);

  const provider = new Ed25519Provider(privateKeyBuffer, publicKeyBuffer);

  const wallet = new Wallet(privateKeyBuffer);

  await authenticateWithEthereum(provider, wallet.address);
}

async function getProfileFromCeramic() {
  try {
    //use the DIDDatastore to get profile data from Ceramic
    const profile = await datastore.get("BasicProfile");

    //render profile data to the DOM (not written yet)
    renderProfileData(profile);
  } catch (error) {
    console.error(error);
  }
}

function renderProfileData(data) {
  if (!data) return;
  data.name ? (profileName.innerHTML = "Name:     " + data.name) : (profileName.innerHTML = "Name:     ");
  data.gender ? (profileGender.innerHTML = "Gender:     " + data.gender) : (profileGender.innerHTML = "Gender:     ");
  data.country
    ? (profileCountry.innerHTML = "Country:     " + data.country)
    : (profileCountry.innerHTML = "Country:     ");
}

async function updateProfileOnCeramic() {
  try {
    const updatedProfile = getFormProfile();
    submitBtn.value = "Updating...";

    //use the DIDDatastore to merge profile data to Ceramic
    await datastore.merge("BasicProfile", updatedProfile);

    //use the DIDDatastore to get profile data from Ceramic
    const profile = await datastore.get("BasicProfile");

    renderProfileData(profile);

    submitBtn.value = "Submit";
  } catch (error) {
    console.error(error);
  }
}

function getFormProfile() {
  const name = document.getElementById("name").value;
  const country = document.getElementById("country").value;
  const gender = document.getElementById("gender").value;

  return {
    name,
    country,
    gender,
  };
}

async function connectWallet(authFunction, callback) {
  try {
    walletBtn.innerHTML = "Connecting...";
    await authFunction();
    await callback();
    walletBtn.innerHTML = "Wallet Connected";
  } catch (error) {
    console.error(error);
  }
}

walletBtn.addEventListener("click", async () => await connectWallet(auth, getProfileFromCeramic));

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await updateProfileOnCeramic();
});
