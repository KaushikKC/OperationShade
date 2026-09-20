/** npm run reset — drop an uploaded export and go back to the committed inbox. */
import { clearInbox, inboxIsUploaded } from '../lib/store'

async function main() {
  const had = await inboxIsUploaded()
  await clearInbox()
  process.stdout.write(had ? 'Uploaded inbox cleared. Reading data/dms.json again.\n' : 'Nothing uploaded — already reading data/dms.json.\n')
}
main()
