import { REQUISITE_FIELDS, SOCIAL_FIELDS, getSiteInfo } from '@/lib/settings'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const info = await getSiteInfo()
  return <SettingsForm info={info} requisiteFields={REQUISITE_FIELDS} socialFields={SOCIAL_FIELDS} />
}
