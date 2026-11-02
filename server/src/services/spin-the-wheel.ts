import { Entry, Results, IEntry, IResults } from "../models/spin-the-wheel";
import { UserRole } from "../models/user";

export async function getEntries(role: UserRole) {
  const docs = await Entry.find().lean();
  if (role === 'partner' || role === 'admin') return docs;

  const filteredDocs = docs.map(entry => (
    entry.private ? { ...entry, name: '*'.repeat(entry.name.length) } : entry
  ));
  return filteredDocs;
}

export async function countEntries() {
  const count = await Entry.countDocuments();
  return count;
}
