import { createTransform } from 'redux-persist'
import CryptoJSCore from 'crypto-js/core'
import AES from 'crypto-js/aes'
import R from 'ramda'
import Immutable from 'seamless-immutable'
import { makeEncryptor, makeDecryptor } from './helpers'

// is this object already Immutable?
const isImmutable = R.has('asMutable')

// change this Immutable object into a JS object
const convertToJs = (state) => state.asMutable({deep: true})

// optionally convert this object into a JS object if it is Immutable
const fromImmutable = R.when(isImmutable, convertToJs)

const toImmutable = (raw) => Immutable(raw)

const makeSyncEncryptor = secretKey =>
    makeEncryptor(state => {
        return AES.encrypt(fromImmutable(state), secretKey).toString()
    })

const makeSyncDecryptor = (secretKey, onError) =>
    makeDecryptor(state => {
        try {
            // In case state is not encrypted
            try {
                JSON.parse(state)
                return toImmutable(JSON.parse(state))
            }
            catch(e){
                const bytes = AES.decrypt(state, secretKey)
                const decryptedString = bytes.toString(CryptoJSCore.enc.Utf8)
                return toImmutable(JSON.parse(decryptedString))
            }
        } catch (err) {
            throw new Error(
                'Could not decrypt state. Please verify that you are using the correct secret key.'
            )
        }
    }, onError)

export default config => {
    const inbound = makeSyncEncryptor(config.secretKey)
    const outbound = makeSyncDecryptor(config.secretKey, config.onError)
    return createTransform(inbound, outbound, config)
}
