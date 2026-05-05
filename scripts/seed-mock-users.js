/**
 * Seed script: 5 Colombian universities + admins + teachers + students
 *
 * Usage:  node scripts/seed-mock-users.js
 * Creates:
 *   - 5 institution records
 *   - 1 admin  per institution  (5 total)
 *   - 10 teachers per institution  (50 total)
 *   - 100 students per institution  (500 total)
 * Password for every account: 123456789
 * Emails all contain ".mock@" so they're easy to identify / delete later.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPERADMIN_ID = "73374c91-8fd9-47aa-b150-bdb14009d856"; // Admin Test (superadmin)
const DEFAULT_PASSWORD = "123456789";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Universities ──────────────────────────────────────────────────────────────

const UNIVERSITIES = [
  {
    name: "Universidad Nacional de Colombia",
    slug: "unal",
    domain: "unal.edu.co",
    city: "Bogotá",
    country: "Colombia",
    address: "Cra. 45 #26-85, Ciudad Universitaria, Bogotá",
    phone: "+57 601 316 5000",
    email: "info.mock@unal.edu.co",
    website: "https://unal.edu.co",
  },
  {
    name: "Universidad de Antioquia",
    slug: "udea",
    domain: "udea.edu.co",
    city: "Medellín",
    country: "Colombia",
    address: "Calle 67 #53-108, Medellín",
    phone: "+57 604 219 8332",
    email: "info.mock@udea.edu.co",
    website: "https://udea.edu.co",
  },
  {
    name: "Universidad del Valle",
    slug: "univalle",
    domain: "univalle.edu.co",
    city: "Cali",
    country: "Colombia",
    address: "Ciudad Universitaria Meléndez, Cali",
    phone: "+57 602 321 2100",
    email: "info.mock@univalle.edu.co",
    website: "https://univalle.edu.co",
  },
  {
    name: "Universidad de los Andes",
    slug: "uniandes",
    domain: "uniandes.edu.co",
    city: "Bogotá",
    country: "Colombia",
    address: "Cra. 1 #18A-12, Bogotá",
    phone: "+57 601 339 4949",
    email: "info.mock@uniandes.edu.co",
    website: "https://uniandes.edu.co",
  },
  {
    name: "Universidad Popular del Cesar",
    slug: "unicesar",
    domain: "unicesar.edu.co",
    city: "Valledupar",
    country: "Colombia",
    address: "Calle 16 #13-15, Valledupar",
    phone: "+57 605 574 7624",
    email: "info.mock@unicesar.edu.co",
    website: "https://unicesar.edu.co",
  },
];

// ── Name pools ────────────────────────────────────────────────────────────────

const MALE_NAMES = [
  "Carlos", "Juan", "Andres", "Santiago", "David", "Daniel", "Miguel",
  "Luis", "Jorge", "Alejandro", "Sergio", "Felipe", "Mateo", "Sebastian",
  "Camilo", "Nicolas", "Ricardo", "Eduardo", "Pablo", "Julian", "Hernan",
  "Fernando", "Alberto", "Mario", "Gustavo", "Raul", "Javier", "Arturo",
  "Marcos", "Cristian", "Ivan", "Oscar", "Mauricio", "Roberto", "Diego",
  "Hector", "Emanuel", "Fabian", "Rodrigo", "Esteban",
];

const FEMALE_NAMES = [
  "Maria", "Ana", "Laura", "Carolina", "Sandra", "Diana", "Patricia",
  "Valentina", "Juliana", "Catalina", "Isabella", "Natalia", "Paula",
  "Sofia", "Claudia", "Lucia", "Gabriela", "Andrea", "Marcela", "Lorena",
  "Gloria", "Adriana", "Viviana", "Paola", "Melissa", "Tatiana", "Camila",
  "Veronica", "Yolanda", "Monica", "Lina", "Stefania", "Manuela", "Daniela",
  "Vanessa", "Angela", "Liliana", "Esperanza", "Cecilia", "Xiomara",
];

const LAST_NAMES = [
  "Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Perez", "Sanchez",
  "Ramirez", "Torres", "Flores", "Rivera", "Gomez", "Diaz", "Reyes",
  "Morales", "Jimenez", "Vargas", "Herrera", "Castro", "Rojas", "Mendoza",
  "Ortiz", "Alvarez", "Silva", "Molina", "Ramos", "Arias", "Medina",
  "Suarez", "Rios", "Ruiz", "Vega", "Lara", "Pena", "Guerrero", "Delgado",
  "Munoz", "Aguilar", "Salazar", "Palacios", "Ospina", "Montoya", "Castano",
  "Cardona", "Gutierrez", "Mora", "Cardenas", "Acosta", "Mejia", "Baron",
  "Cano", "Pineda", "Escobar", "Toro", "Zapata", "Valencia", "Lozano",
  "Posada", "Velez", "Bernal", "Soto", "Fuentes", "Ossa", "Naranjo",
];

// ── Utilities ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildName(pool, index) {
  const all = [...MALE_NAMES, ...FEMALE_NAMES];
  const first = pool === "teacher"
    ? all[index % all.length]
    : index % 2 === 0
      ? MALE_NAMES[Math.floor(index / 2) % MALE_NAMES.length]
      : FEMALE_NAMES[Math.floor(index / 2) % FEMALE_NAMES.length];
  const last1 = LAST_NAMES[index % LAST_NAMES.length];
  const last2 = LAST_NAMES[(index + 13) % LAST_NAMES.length];
  return { firstName: first, lastName: `${last1} ${last2}` };
}

function buildEmail(firstName, lastName1, domain, role, index) {
  const fn = firstName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");
  const ln = lastName1.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "");
  return `${fn}.${ln}${index > 0 ? index : ""}.mock@${domain}`;
}

let userCounter = 0;

async function createAuthAndDbUser(email, name, role, institutionId) {
  // 1. Create Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authErr) {
    // Skip duplicates silently
    if (authErr.message?.includes("already")) return null;
    throw new Error(`Auth error for ${email}: ${authErr.message}`);
  }

  const uid = authData.user.id;

  // 2. Insert into public.users
  const { error: dbErr } = await supabase.from("users").insert({
    id: uid,
    name,
    email,
    role,
    institution_id: institutionId,
  });

  if (dbErr && !dbErr.message?.includes("duplicate")) {
    console.warn(`  ⚠ DB insert failed for ${email}: ${dbErr.message}`);
  }

  userCounter++;
  return uid;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Captus mock-data seed starting…\n");

  for (const uni of UNIVERSITIES) {
    console.log(`\n🏛  ${uni.name} (${uni.domain})`);

    // ── 1. Create institution ──────────────────────────────────────────────
    const { data: existingInst } = await supabase
      .from("institutions")
      .select("id")
      .eq("slug", uni.slug)
      .maybeSingle();

    let institutionId;
    if (existingInst) {
      institutionId = existingInst.id;
      console.log(`   ↩ Institution already exists (${institutionId})`);
    } else {
      const { data: inst, error: instErr } = await supabase
        .from("institutions")
        .insert({
          name: uni.name,
          slug: uni.slug,
          city: uni.city,
          country: uni.country,
          address: uni.address,
          phone: uni.phone,
          email: uni.email,
          website: uni.website,
          created_by: SUPERADMIN_ID,
          is_active: true,
        })
        .select("id")
        .single();

      if (instErr) {
        console.error(`   ✗ Institution creation failed: ${instErr.message}`);
        continue;
      }
      institutionId = inst.id;
      console.log(`   ✓ Institution created (${institutionId})`);
    }

    // ── 2. Admin user (1) ──────────────────────────────────────────────────
    const adminEmail = `admin.${uni.slug}.mock@${uni.domain}`;
    const adminName = `Admin ${uni.name}`;
    const adminId = await createAuthAndDbUser(adminEmail, adminName, "admin", institutionId);
    console.log(`   ✓ Admin: ${adminEmail}`);
    await sleep(150);

    // ── 3. Teachers (10) ──────────────────────────────────────────────────
    console.log(`   Creating 10 teachers…`);
    const emailsSeen = new Set();

    for (let i = 0; i < 10; i++) {
      const { firstName, lastName } = buildName("teacher", i + 7); // offset to differ from students
      const lastName1 = lastName.split(" ")[0];
      let email = buildEmail(firstName, lastName1, uni.domain, "teacher", 0);
      // Ensure uniqueness within this batch
      if (emailsSeen.has(email)) email = buildEmail(firstName, lastName1, uni.domain, "teacher", i + 1);
      emailsSeen.add(email);

      const fullName = `${firstName} ${lastName}`;
      try {
        await createAuthAndDbUser(email, fullName, "teacher", institutionId);
        process.stdout.write(".");
      } catch (e) {
        process.stdout.write("!");
        console.error(`\n     Error: ${e.message}`);
      }
      await sleep(150);
    }
    console.log(` done`);

    // ── 4. Students (100) ─────────────────────────────────────────────────
    console.log(`   Creating 100 students…`);

    for (let i = 0; i < 100; i++) {
      const { firstName, lastName } = buildName("student", i);
      const lastName1 = lastName.split(" ")[0];
      const suffix = Math.floor(i / (MALE_NAMES.length + FEMALE_NAMES.length));
      let email = buildEmail(firstName, lastName1, uni.domain, "student", suffix > 0 ? suffix : 0);
      if (emailsSeen.has(email)) email = buildEmail(firstName, lastName1, uni.domain, "student", i + 1);
      emailsSeen.add(email);

      const fullName = `${firstName} ${lastName}`;
      try {
        await createAuthAndDbUser(email, fullName, "student", institutionId);
        if ((i + 1) % 10 === 0) process.stdout.write(`${i + 1}`);
        else process.stdout.write(".");
      } catch (e) {
        process.stdout.write("!");
        console.error(`\n     Error: ${e.message}`);
      }
      await sleep(150);
    }
    console.log(` done`);
  }

  console.log(`\n✅  Seed complete — ${userCounter} users created across ${UNIVERSITIES.length} institutions`);
}

main().catch((err) => {
  console.error("\n💥 Fatal:", err);
  process.exit(1);
});
