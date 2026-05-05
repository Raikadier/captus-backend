import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DAVID = "6438b565-5e1e-4267-9f5c-b418af15b25f";

const rows = [
  {
    title: "Derivadas — Reglas esenciales",
    subject: "Cálculo Diferencial",
    is_pinned: true,
    content: "# Reglas de Derivación\n\nd/dx [x^n] = n·x^(n-1)\nd/dx [f·g] = f'·g + f·g'\nd/dx [f(g(x))] = f'(g(x))·g'(x)\n\n## Derivadas clave\n- d/dx [sin x] = cos x\n- d/dx [cos x] = -sin x\n- d/dx [e^x] = e^x\n- d/dx [ln x] = 1/x",
    user_id: DAVID,
  },
  {
    title: "Python — Estructuras de datos",
    subject: "Fundamentos de Programación",
    is_pinned: true,
    content: "# Estructuras Python\n\n## Lista\nfrutas = ['manzana','banano']\nfrutas.append('uva')\n\n## Dict\nestudiante = {'nombre':'David','nota':4.5}\n\n## List comprehension\ncuadrados = [x**2 for x in range(10)]\n\n## Recursion\ndef factorial(n):\n    return 1 if n<=1 else n*factorial(n-1)",
    user_id: DAVID,
  },
  {
    title: "Álgebra Lineal — Matrices",
    subject: "Álgebra Lineal",
    is_pinned: false,
    content: "# Matrices\n\n## Det 2x2: ad - bc\n## Inversa: existe si det != 0\n## Rango: eliminacion de Gauss\n\n## Para el parcial:\nvalores propios, vectores propios, diagonalizacion",
    user_id: DAVID,
  },
  {
    title: "Leyes de Newton",
    subject: "Física Mecánica",
    is_pinned: false,
    content: "# Leyes de Newton\n\n1a Ley: velocidad constante sin fuerza neta\n2a Ley: F = m*a\n3a Ley: F_AB = -F_BA\n\n## Cinematica\nv = v0 + a*t\nx = x0 + v0*t + 0.5*a*t^2\nv^2 = v0^2 + 2*a*dx",
    user_id: DAVID,
  },
  {
    title: "Formulas Segundo Parcial Calculo",
    subject: "Cálculo Diferencial",
    is_pinned: true,
    content: "# Cheat Sheet Parcial 2\n\n## Optimizacion\nf'(x)=0 candidatos\nf''(x)>0 minimo\nf''(x)<0 maximo\n\n## L'Hopital\nlim f/g = lim f'/g' (0/0 o inf/inf)\n\n## TVM\nexiste c: f'(c) = (f(b)-f(a))/(b-a)",
    user_id: DAVID,
  },
  {
    title: "Arquitectura de computadores",
    subject: "Introducción a la Computación",
    is_pinned: false,
    content: "# Arquitectura\n\nCPU = ALU + CU + Registros\nRAM: volatil | Cache: L1/L2/L3\n\n## Ciclo: Fetch -> Decode -> Execute -> Write-back\n\n## Numeracion\n1010_bin = 10_dec | A_hex = 10_dec\n\n## SO: FCFS, SJF, Round Robin",
    user_id: DAVID,
  },
];

const { error } = await sb.from("notes").insert(rows);
if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log(`✓ ${rows.length} notes inserted for David`);
