import * as Cord from '@cord.network/sdk'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { generateKeypairs } from './generateKeypairs'

export async function createDid(
  submitterAccount: Cord.CordKeyringPair
): Promise<{
  mnemonic: string
  document: Cord.DidDocument
}> {
  const api = Cord.ConfigService.get('api')

  const mnemonic = mnemonicGenerate()
  const {
    authentication,
    keyAgreement,
    assertionMethod,
    capabilityDelegation,
  } = generateKeypairs(mnemonic)
  // Get tx that will create the DID on chain and DID-URI that can be used to resolve the DID Document.
  const didCreationTx = await Cord.Did.getStoreTx(
    {
      authentication: [authentication],
      keyAgreement: [keyAgreement],
      assertionMethod: [assertionMethod],
      capabilityDelegation: [capabilityDelegation],
      // Example service.
      service: [
        {
          id: '#my-service',
          type: ['service-type'],
          serviceEndpoint: ['https://www.example.com'],
        },
      ],
    },
    submitterAccount.address,
    async ({ data }) => ({
      signature: authentication.sign(data),
      keyType: authentication.type,
    })
  )

  await Cord.Chain.signAndSubmitTx(didCreationTx, submitterAccount)

  const didUri = Cord.Did.getDidUriFromKey(authentication)
  const encodedDid = await api.call.did.query(Cord.Did.toChain(didUri))
  const { document } = Cord.Did.linkedInfoFromChain(encodedDid)

  if (!document) {
    throw new Error('DID was not successfully created.')
  }

  return { mnemonic, document: document }
}