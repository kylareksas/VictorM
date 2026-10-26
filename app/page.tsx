"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Clock,
  Calendar,
  ShieldAlert,
  Download,
  Edit3,
  LogIn,
  LogOut,
  Plus,
  UserCheck,
  Store,
  Hammer,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iseepuikkddprcgpdsmf.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ZWIF3qp5pWVoxhxJ2Ymizg_LbdJ12Ou";
const supabase = createClient(supabaseUrl, supabaseKey);

type Ubicacion = "taller" | "nijar" | "san_jose";
type Empleado = {
  id: string;
  nombre: string;
  pin_acceso: string;
  tipo: "fijo_taller" | "rotativo" | "admin";
  horas_contrato_semanal: number;
};

type Turno = {
  id: string;
  empleado_id: string;
  fecha: string;
  ubicacion: Ubicacion;
  hora_inicio: string;
  hora_fin: string;
  horas_totales: number;
};

type Fichaje = {
  id: string;
  empleado_id: string;
  fecha: string;
  ubicacion: Ubicacion;
  entrada: string;
  salida: string | null;
  entrada_original: string | null;
  salida_original: string | null;
  editado_manualmente: boolean;
  nota_edicion: string | null;
};

const NOMBRES_SEDE: Record<Ubicacion, string> = {
  taller: "Taller Central",
  nijar: "Tienda Níjar",
  san_jose: "Tienda San José",
};

const COLORES_SEDE: Record<Ubicacion, string> = {
  taller: "bg-stone-200 text-stone-800 border-stone-300",
  nijar: "bg-amber-100 text-amber-900 border-amber-300",
  san_jose: "bg-sky-100 text-sky-900 border-sky-300",
};

function toFechaLocalISO(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function aMinutos(horaHHMM: string): number {
  const [h, m] = horaHHMM.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function deMinutosAHHMM(minutosTotales: number): string {
  const h = Math.floor(minutosTotales / 60);
  const m = Math.round(minutosTotales % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function VictorMoralesApp() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<Empleado | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [empleadoSeleccionadoLogin, setEmpleadoSeleccionadoLogin] = useState<Empleado | null>(null);
  const [errorLogin, setErrorLogin] = useState("");
  const [procesando, setProcesando] = useState(false);

  const [tabActiva, setTabActiva] = useState<"fichar" | "horario" | "admin">("fichar");
  const [vistaHorario, setVistaHorario] = useState<"semanal" | "mensual">("semanal");
  const [desplazamientoSemana, setDesplazamientoSemana] = useState(0);

  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [sedeFichaje, setSedeFichaje] = useState<Ubicacion>("taller");

  const [fichajeEditando, setFichajeEditando] = useState<Fichaje | null>(null);
  const [nuevaEntrada, setNuevaEntrada] = useState("");
  const [nuevaSalida, setNuevaSalida] = useState("");
  const [motivoEdicion, setMotivoEdicion] = useState("");

  const [adminEmpleadoId, setAdminEmpleadoId] = useState("");
  const [adminFecha, setAdminFecha] = useState("");
  const [adminSede, setAdminSede] = useState<Ubicacion>("nijar");
  const [adminInicio, setAdminInicio] = useState("10:00");
  const [adminFin, setAdminFin] = useState("14:00");
  
  const [modoCreacionTurno, setModoCreacionTurno] = useState<"dia" | "laborables" | "toda_semana">("dia");

  const [mesExportar, setMesExportar] = useState("");
  const [empleadoExportar, setEmpleadoExportar] = useState("todos");

  const [hoyCliente, setHoyCliente] = useState<string>("");

  useEffect(() => {
    const hoyLocal = toFechaLocalISO(new Date());
    setAdminFecha(hoyLocal);
    setMesExportar(hoyLocal.slice(0, 7));
    setHoyCliente(hoyLocal);
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: empData } = await supabase.from("empleados").select("*").order("nombre");
    if (empData) {
      setEmpleados(empData);
      const primerTrabajador = empData.find((e) => e.tipo !== "admin") || empData[0];
      if (primerTrabajador && !adminEmpleadoId) {
        setAdminEmpleadoId(primerTrabajador.id);
      }
      const idGuardado = localStorage.getItem("vm_usuario_id");
      if (idGuardado && !usuarioActual) {
        const encontrado = empData.find((e) => e.id === idGuardado);
        if (encontrado) setUsuarioActual(encontrado);
      }
    }

    const { data: fichData } = await supabase
      .from("fichajes")
      .select("*")
      .order("entrada", { ascending: false });
    if (fichData) setFichajes(fichData);

    const { data: turnData } = await supabase
      .from("turnos_planificados")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });
    if (turnData) setTurnos(turnData);
  }

  function manejarLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadoSeleccionadoLogin || !hoyCliente) return;
    if (empleadoSeleccionadoLogin.pin_acceso === pinInput) {
      setUsuarioActual(empleadoSeleccionadoLogin);
      localStorage.setItem("vm_usuario_id", empleadoSeleccionadoLogin.id);
      setPinInput("");
      setErrorLogin("");
      setTabActiva("fichar");

      const turnoHoy = turnos.find(
        (t) => t.empleado_id === empleadoSeleccionadoLogin.id && t.fecha === hoyCliente
      );
      if (turnoHoy) setSedeFichaje(turnoHoy.ubicacion);
    } else {
      setErrorLogin("PIN incorrecto");
    }
  }

  function cerrarSesion() {
    localStorage.removeItem("vm_usuario_id");
    setUsuarioActual(null);
    setEmpleadoSeleccionadoLogin(null);
    setTabActiva("fichar");
  }

  const fichajeAbierto = useMemo(() => {
    if (!usuarioActual) return null;
    return fichajes.find((f) => f.empleado_id === usuarioActual.id && f.salida === null);
  }, [fichajes, usuarioActual]);

  async function ficharEntrada() {
    if (!usuarioActual || procesando || fichajeAbierto || !hoyCliente) return;
    setProcesando(true);
    try {
      const ahora = new Date();
      const { error } = await supabase.from("fichajes").insert({
        empleado_id: usuarioActual.id,
        fecha: hoyCliente,
        ubicacion: sedeFichaje,
        entrada: ahora.toISOString(),
      });
      if (error) alert("Error al registrar entrada: " + error.message);
      await cargarDatos();
    } finally {
      setProcesando(false);
    }
  }

  async function ficharSalida() {
    if (!fichajeAbierto || procesando) return;
    setProcesando(true);
    try {
      const ahora = new Date().toISOString();
      const { error } = await supabase
        .from("fichajes")
        .update({ salida: ahora })
        .eq("id", fichajeAbierto.id);
      if (error) alert("Error al registrar salida: " + error.message);
      await cargarDatos();
    } finally {
      setProcesando(false);
    }
  }

  function abrirModalEdicion(f: Fichaje) {
    setFichajeEditando(f);
    const dEntrada = new Date(f.entrada);
    setNuevaEntrada(dEntrada.toTimeString().slice(0, 5));

    if (f.salida) {
      const dSalida = new Date(f.salida);
      setNuevaSalida(dSalida.toTimeString().slice(0, 5));
    } else {
      setNuevaSalida("14:00");
    }
    setMotivoEdicion(f.nota_edicion || "");
  }

  async function guardarEdicionManual(e: React.FormEvent) {
    e.preventDefault();
    if (!fichajeEditando || !motivoEdicion.trim() || procesando) {
      alert("Es obligatorio indicar el motivo de la corrección.");
      return;
    }

    if (nuevaSalida && aMinutos(nuevaSalida) <= aMinutos(nuevaEntrada)) {
      alert("La hora de salida debe ser posterior a la hora de entrada.");
      return;
    }

    setProcesando(true);
    try {
      const fechaBase = fichajeEditando.fecha;
      const isoEntrada = new Date(`${fechaBase}T${nuevaEntrada}:00`).toISOString();
      const isoSalida = nuevaSalida
        ? new Date(`${fechaBase}T${nuevaSalida}:00`).toISOString()
        : null;

      const { error } = await supabase
        .from("fichajes")
        .update({
          entrada: isoEntrada,
          salida: isoSalida,
          entrada_original: fichajeEditando.entrada_original || fichajeEditando.entrada,
          salida_original: fichajeEditando.salida_original || fichajeEditando.salida,
          editado_manualmente: true,
          nota_edicion: motivoEdicion.trim(),
        })
        .eq("id", fichajeEditando.id);

      if (error) {
        alert("No se pudo guardar el cambio: " + error.message);
      } else {
        setFichajeEditando(null);
        await cargarDatos();
      }
    } finally {
      setProcesando(false);
    }
  }

  const diasSemanaSeleccionada = useMemo(() => {
    if (!hoyCliente) return Array.from({ length: 7 }, () => "");

    const hoy = new Date(hoyCliente + "T12:00:00");
    const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diaSemana + 1 + desplazamientoSemana * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return toFechaLocalISO(d);
    });
  }, [hoyCliente, desplazamientoSemana]);

  const resumenCompensacionSemanal = useMemo(() => {
    const inicioSemana = diasSemanaSeleccionada[0];
    const finSemana = diasSemanaSeleccionada[6];
    if (!inicioSemana || !finSemana) return [];

    return empleados
      .filter((e) => e.tipo !== "admin")
      .map((emp) => {
        const turnosEmp = turnos.filter(
          (t) => t.empleado_id === emp.id && t.fecha >= inicioSemana && t.fecha <= finSemana
        );

        const horasTienda = Number(
          turnosEmp
            .filter((t) => t.ubicacion === "nijar" || t.ubicacion === "san_jose")
            .reduce((acc, curr) => acc + Number(curr.horas_totales), 0)
            .toFixed(2)
        );

        const horasTaller = Number(
          turnosEmp
            .filter((t) => t.ubicacion === "taller")
            .reduce((acc, curr) => acc + Number(curr.horas_totales), 0)
            .toFixed(2)
        );

        const totalPlanificado = Number((horasTienda + horasTaller).toFixed(2));
        const faltanParaTaller = Number(
          Math.max(0, emp.horas_contrato_semanal - totalPlanificado).toFixed(2)
        );

        return {
          empleado: emp,
          horasTienda,
          horasTaller,
          totalPlanificado,
          faltanParaTaller,
        };
      });
  }, [empleados, turnos, diasSemanaSeleccionada]);

  async function crearTurnoPlanificado(e: React.FormEvent) {
    e.preventDefault();
    if (procesando) return;

    const minIni = aMinutos(adminInicio);
    const minFin = aMinutos(adminFin);
    const horasCalculadas = (minFin - minIni) / 60;

    if (horasCalculadas <= 0) {
      alert("La hora de salida debe ser posterior a la de entrada.");
      return;
    }

    let fechasAplica: string[] = [];
    if (modoCreacionTurno === "dia") {
      fechasAplica = [adminFecha];
    } else if (modoCreacionTurno === "laborables") {
      const dBase = new Date(adminFecha + "T12:00:00");
      const diaSem = dBase.getDay() === 0 ? 7 : dBase.getDay();
      const lunes = new Date(dBase);
      lunes.setDate(dBase.getDate() - diaSem + 1);
      
      fechasAplica = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        return toFechaLocalISO(d);
      });
    } else if (modoCreacionTurno === "toda_semana") {
      const dBase = new Date(adminFecha + "T12:00:00");
      const diaSem = dBase.getDay() === 0 ? 7 : dBase.getDay();
      const lunes = new Date(dBase);
      lunes.setDate(dBase.getDate() - diaSem + 1);
      
      fechasAplica = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        return toFechaLocalISO(d);
      });
    }

    setProcesando(true);
    try {
      const nuevosTurnos: Omit<Turno, "id">[] = [];

      for (const fFecha of fechasAplica) {
        const turnosMismoDia = turnos.filter(
          (t) => t.empleado_id === adminEmpleadoId && t.fecha === fFecha
        );

        const haySolapamiento = turnosMismoDia.some((t) => {
          const tIni = aMinutos(t.hora_inicio);
          const tFin = aMinutos(t.hora_fin);
          return minIni < tFin && minFin > tIni;
        });

        if (!haySolapamiento) {
          nuevosTurnos.push({
            empleado_id: adminEmpleadoId,
            fecha: fFecha,
            ubicacion: adminSede,
            hora_inicio: adminInicio,
            hora_fin: adminFin,
            horas_totales: Number(horasCalculadas.toFixed(2)),
          });
        }
      }

      if (nuevosTurnos.length === 0) {
        alert("No se pudo crear ningún turno: ya existen turnos solapados en esas fechas para este empleado.");
      } else {
        const { error } = await supabase.from("turnos_planificados").insert(nuevosTurnos);
        if (error) alert("Error al guardar turnos: " + error.message);
        else await cargarDatos();
      }
    } finally {
      setProcesando(false);
    }
  }

  async function eliminarTurno(id: string) {
    if (procesando) return;
    setProcesando(true);
    try {
      await supabase.from("turnos_planificados").delete().eq("id", id);
      await cargarDatos();
    } finally {
      setProcesando(false);
    }
  }

  async function generarTurnosFijosTallerSemana() {
    if (procesando) return;
    setProcesando(true);

    try {
      const fijosTaller = empleados.filter((e) => e.tipo === "fijo_taller");
      if (fijosTaller.length === 0) {
        alert("No hay empleados configurados como 'fijo_taller'.");
        return;
      }

      const nuevosTurnos: Omit<Turno, "id">[] = [];

      for (let i = 0; i < 5; i++) {
        const fechaDia = diasSemanaSeleccionada[i];
        if (!fechaDia) continue;

        for (const emp of fijosTaller) {
          const yaTieneTurno = turnos.some(
            (t) => t.empleado_id === emp.id && t.fecha === fechaDia
          );

          if (!yaTieneTurno) {
            nuevosTurnos.push({
              empleado_id: emp.id,
              fecha: fechaDia,
              ubicacion: "taller",
              hora_inicio: "07:00",
              hora_fin: "15:00",
              horas_totales: 8,
            });
          }
        }
      }

      if (nuevosTurnos.length === 0) {
        alert("Los trabajadores fijos de taller ya tienen turnos asignados en todos los días de esta semana.");
      } else {
        const { error } = await supabase.from("turnos_planificados").insert(nuevosTurnos);
        if (error) {
          alert("Error al generar turnos automáticos: " + error.message);
        } else {
          await cargarDatos();
          alert(`¡Se han generado ${nuevosTurnos.length} turnos automáticos (L-V de 07:00 a 15:00) para los fijos de taller!`);
        }
      }
    } finally {
      setProcesando(false);
    }
  }

  async function autocompletarSemanaTaller() {
    if (procesando) return;
    setProcesando(true);

    try {
      const nuevosTurnos: Omit<Turno, "id">[] = [];

      for (const item of resumenCompensacionSemanal) {
        let horasPendientes = item.faltanParaTaller;
        if (horasPendientes <= 0) continue;

        for (let i = 0; i < 6 && horasPendientes > 0; i++) {
          const fechaDia = diasSemanaSeleccionada[i];
          if (!fechaDia) continue;

          const turnosDia = turnos.filter(
            (t) => t.empleado_id === item.empleado.id && t.fecha === fechaDia
          );

          const horasYaAsignadasHoy = turnosDia.reduce(
            (acc, curr) => acc + Number(curr.horas_totales),
            0
          );
          const huecoDisponibleHoy = Math.max(0, 8 - horasYaAsignadasHoy);
          if (huecoDisponibleHoy <= 0) continue;

          const tramosCandidatos = [
            { inicio: 8 * 60, maxDuracion: 6 },
            { inicio: 15 * 60, maxDuracion: 5 },
          ];

          for (const tramo of tramosCandidatos) {
            if (horasPendientes <= 0) break;
            const horasAsignar = Math.min(
              horasPendientes,
              huecoDisponibleHoy,
              tramo.maxDuracion
            );
            if (horasAsignar <= 0) continue;

            const minIni = tramo.inicio;
            const minFin = minIni + Math.round(horasAsignar * 60);

            const choca = turnosDia.some((t) => {
              const tIni = aMinutos(t.hora_inicio);
              const tFin = aMinutos(t.hora_fin);
              return minIni < tFin && minFin > tIni;
            });

            if (!choca) {
              const nuevoTurno = {
                empleado_id: item.empleado.id,
                fecha: fechaDia,
                ubicacion: "taller" as Ubicacion,
                hora_inicio: deMinutosAHHMM(minIni),
                hora_fin: deMinutosAHHMM(minFin),
                horas_totales: Number(horasAsignar.toFixed(2)),
              };
              nuevosTurnos.push(nuevoTurno);
              turnosDia.push({ id: "temp", ...nuevoTurno });
              horasPendientes = Number((horasPendientes - horasAsignar).toFixed(2));
            }
          }
        }
      }

      if (nuevosTurnos.length === 0) {
        alert("No hay horas pendientes o no quedan huecos libres sin solapar en esta semana.");
      } else {
        const { error } = await supabase.from("turnos_planificados").insert(nuevosTurnos);
        if (error) {
          alert("Error al autocompletar: " + error.message);
        } else {
          await cargarDatos();
          alert(`¡Se han generado ${nuevosTurnos.length} turnos de taller repartidos en la semana!`);
        }
      }
    } finally {
      setProcesando(false);
    }
  }

  function descargarExcelCSV() {
    const fichajesFiltrados = fichajes.filter((f) => {
      const coincideMes = f.fecha.startsWith(mesExportar);
      const coincideEmp = empleadoExportar === "todos" || f.empleado_id === empleadoExportar;
      return coincideMes && coincideEmp;
    });

    const cabeceras = [
      "Empleado",
      "Fecha",
      "Centro",
      "Hora Entrada",
      "Hora Salida",
      "Horas Trabajadas",
      "Editado a mano",
      "Motivo Edicion",
    ];

    const filas = fichajesFiltrados.map((f) => {
      const empNombre = empleados.find((e) => e.id === f.empleado_id)?.nombre || "Desconocido";
      const dEnt = new Date(f.entrada);
      const dSal = f.salida ? new Date(f.salida) : null;
      const strEntrada = dEnt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const strSalida = dSal
        ? dSal.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
        : "SIN SALIDA";

      const horasTrabajadas = dSal
        ? Math.max(0, (dSal.getTime() - dEnt.getTime()) / (1000 * 60 * 60)).toFixed(2)
        : "0.00";

      return [
        `"${empNombre}"`,
        f.fecha,
        `"${NOMBRES_SEDE[f.ubicacion]}"`,
        strEntrada,
        strSalida,
        horasTrabajadas.replace(".", ","),
        f.editado_manualmente ? "SI" : "NO",
        `"${(f.nota_edicion || "").replace(/"/g, '""')}"`,
      ].join(";");
    });

    const contenidoCSV = "\uFEFF" + [cabeceras.join(";"), ...filas].join("\n");
    const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Registro_VictorMorales_${mesExportar}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 text-stone-800">
        <div className="max-w-md w-full bg-stone-900 rounded-2xl shadow-md overflow-hidden border border-stone-800">
          <div className="bg-stone-950 p-5 flex justify-center border-b border-stone-800">
            <img 
              src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
              alt="Cerámica Víctor Morales" 
              className="h-9 object-contain"
            />
          </div>
          <div className="p-6 bg-white">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                Portal de Control de Fichajes
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                Taller · Tienda Níjar · Tienda San José
              </p>
            </div>

            {!empleadoSeleccionadoLogin ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                  Selecciona tu nombre
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {empleados.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setEmpleadoSeleccionadoLogin(emp)}
                      className="flex items-center justify-between p-4 rounded-xl border border-stone-200 hover:border-stone-800 hover:bg-stone-50 transition text-left"
                    >
                      <span className="font-medium text-stone-900">{emp.nombre}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                        {emp.tipo === "rotativo"
                          ? "Tienda + Taller"
                          : emp.tipo === "fijo_taller"
                          ? "Taller"
                          : "Dirección"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={manejarLogin} className="space-y-4">
                <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="font-semibold">{empleadoSeleccionadoLogin.nombre}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmpleadoSeleccionadoLogin(null);
                      setErrorLogin("");
                    }}
                    className="text-xs text-stone-500 underline"
                  >
                    Cambiar usuario
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    PIN de 4 dígitos
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center text-3xl tracking-widest p-3 rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                  {errorLogin && <p className="text-red-600 text-xs mt-1">{errorLogin}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition"
                >
                  Entrar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const misFichajes = fichajes.filter((f) => f.empleado_id === usuarioActual.id);
  const misTurnosHoy = turnos.filter(
    (t) => t.empleado_id === usuarioActual.id && t.fecha === hoyCliente
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-24">
      <header className="bg-stone-900 text-white border-b border-stone-800 px-4 py-3 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
            alt="Cerámica Víctor Morales" 
            className="h-6 object-contain"
          />
          <span className="text-xs text-stone-400 border-l border-stone-700 pl-3 hidden sm:inline">
            Control de Turnos
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-300 flex items-center gap-1 font-medium bg-stone-800 px-3 py-1 rounded-full">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" /> {usuarioActual.nombre}
          </span>
          <button
            onClick={cerrarSesion}
            className="text-xs px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {tabActiva === "fichar" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                <img 
                  src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                  alt="Cerámica Víctor Morales" 
                  className="h-5 object-contain"
                />
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs uppercase font-semibold text-stone-400">
                  Tu cuadrante para hoy ({hoyCliente})
                </p>
                {misTurnosHoy.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    No tienes turnos asignados hoy en el cuadrante.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {misTurnosHoy.map((t) => (
                      <div
                        key={t.id}
                        className={`flex justify-between items-center p-2.5 rounded-xl border text-sm font-medium ${
                          COLORES_SEDE[t.ubicacion]
                        }`}
                      >
                        <span>{NOMBRES_SEDE[t.ubicacion]}</span>
                        <span>
                          {t.hora_inicio.slice(0, 5)} - {t.hora_fin.slice(0, 5)} ({t.horas_totales}h)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden text-center">
              <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                <img 
                  src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                  alt="Cerámica Víctor Morales" 
                  className="h-5 object-contain"
                />
              </div>
              <div className="p-6 space-y-4">
                {!fichajeAbierto ? (
                  <>
                    <label className="block text-sm font-medium text-stone-600">
                      ¿En qué centro vas a entrar ahora?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["taller", "nijar", "san_jose"] as Ubicacion[]).map((sede) => (
                        <button
                          key={sede}
                          type="button"
                          onClick={() => setSedeFichaje(sede)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition ${
                            sedeFichaje === sede
                              ? "bg-stone-900 text-white border-stone-900"
                              : "bg-stone-50 text-stone-600 border-stone-200"
                          }`}
                        >
                          {NOMBRES_SEDE[sede]}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={ficharEntrada}
                      disabled={procesando}
                      className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition"
                    >
                      <LogIn className="w-6 h-6" />{" "}
                      {procesando ? "REGISTRANDO..." : "FICHAR ENTRADA"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      Trabajando en {NOMBRES_SEDE[fichajeAbierto.ubicacion]} desde las{" "}
                      {new Date(fichajeAbierto.entrada).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    <button
                      onClick={ficharSalida}
                      disabled={procesando}
                      className="w-full py-6 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-6 h-6" />{" "}
                      {procesando ? "CERRANDO TURNO..." : "FINALIZAR JORNADA"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                <img 
                  src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                  alt="Cerámica Víctor Morales" 
                  className="h-5 object-contain"
                />
              </div>
              <div className="p-4 space-y-3">
                <h2 className="font-semibold text-sm text-stone-900">
                  Tus últimos registros (Pulsa el lápiz si olvidaste fichar)
                </h2>
                <div className="divide-y divide-stone-100">
                  {misFichajes.slice(0, 10).map((f) => {
                    const ent = new Date(f.entrada).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const sal = f.salida
                      ? new Date(f.salida).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Abierto";

                    return (
                      <div key={f.id} className="py-3 flex justify-between items-center text-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-900">{f.fecha}</span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                COLORES_SEDE[f.ubicacion]
                              }`}
                            >
                              {NOMBRES_SEDE[f.ubicacion]}
                            </span>
                            {f.editado_manualmente && (
                              <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                *Editado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {ent} → {sal}
                            {f.nota_edicion && ` · (${f.nota_edicion})`}
                          </p>
                        </div>
                        <button
                          onClick={() => abrirModalEdicion(f)}
                          className="p-2 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                          title="Corregir hora manualmente"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tabActiva === "horario" && (
          <div className="space-y-6">
            <div className="flex bg-stone-200 p-1 rounded-xl">
              <button
                onClick={() => setVistaHorario("semanal")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  vistaHorario === "semanal" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
                }`}
              >
                Cuadrante Semanal + Compensación
              </button>
              <button
                onClick={() => setVistaHorario("mensual")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  vistaHorario === "mensual" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
                }`}
              >
                Resumen Mensual
              </button>
            </div>

            {vistaHorario === "semanal" ? (
              <>
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-stone-200 shadow-sm">
                  <button
                    onClick={() => setDesplazamientoSemana((d) => d - 1)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <p className="text-xs font-bold text-stone-900">
                      Semana del {diasSemanaSeleccionada[0]} al {diasSemanaSeleccionada[6]}
                    </p>
                    {desplazamientoSemana !== 0 && (
                      <button
                        onClick={() => setDesplazamientoSemana(0)}
                        className="text-[11px] text-amber-700 underline"
                      >
                        Volver a semana actual
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setDesplazamientoSemana((d) => d + 1)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                    <img 
                      src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                      alt="Cerámica Víctor Morales" 
                      className="h-5 object-contain"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <h2 className="text-sm font-bold text-stone-900">
                      Equilibrio de Horas Semanal (Meta: 40h)
                    </h2>

                    <div className="space-y-3">
                      {resumenCompensacionSemanal.map((item) => (
                        <div
                          key={item.empleado.id}
                          className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5"
                        >
                          <div className="flex justify-between font-semibold text-stone-900">
                            <span>{item.empleado.nombre}</span>
                            <span>
                              {item.totalPlanificado}h / {item.empleado.horas_contrato_semanal}h
                            </span>
                          </div>
                          <div className="flex justify-between text-stone-600">
                            <span>
                              Tienda: <strong>{item.horasTienda}h</strong> · Taller:{" "}
                              <strong>{item.horasTaller}h</strong>
                            </span>
                            {item.faltanParaTaller > 0 ? (
                              <span className="text-amber-700 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Faltan {item.faltanParaTaller}h
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {usuarioActual.tipo === "admin" && (
                      <div className="space-y-2 pt-1">
                        <button
                          onClick={generarTurnosFijosTallerSemana}
                          disabled={procesando}
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition shadow-sm"
                        >
                          <Zap className="w-4 h-4 text-amber-300" />
                          {procesando ? "Generando..." : "Rellenar Fijos de Taller (L-V, 07:00-15:00)"}
                        </button>

                        <button
                          onClick={autocompletarSemanaTaller}
                          disabled={procesando}
                          className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          {procesando
                            ? "Calculando huecos..."
                            : "Autocompletar déficit en Taller para rotativos"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {diasSemanaSeleccionada.map((fechaDia) => {
                    if (!fechaDia) return null;
                    const turnosDia = turnos.filter((t) => t.fecha === fechaDia);
                    const nombreDia = new Date(fechaDia + "T12:00:00").toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    });

                    return (
                      <div
                        key={fechaDia}
                        className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm"
                      >
                        <h3 className="font-bold text-sm capitalize text-stone-900 mb-2">
                          {nombreDia}
                        </h3>
                        {turnosDia.length === 0 ? (
                          <p className="text-xs text-stone-400">Sin turnos planificados</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {(["nijar", "san_jose", "taller"] as Ubicacion[]).map((sede) => {
                              const turnosSede = turnosDia.filter((t) => t.ubicacion === sede);
                              return (
                                <div
                                  key={sede}
                                  className={`p-2.5 rounded-xl border ${COLORES_SEDE[sede]}`}
                                >
                                  <div className="text-xs font-bold mb-1 flex items-center gap-1">
                                    {sede === "taller" ? (
                                      <Hammer className="w-3 h-3" />
                                    ) : (
                                      <Store className="w-3 h-3" />
                                    )}
                                    {NOMBRES_SEDE[sede]}
                                  </div>
                                  {turnosSede.length === 0 ? (
                                    <p className="text-[11px] opacity-60">Nadie asignado</p>
                                  ) : (
                                    <ul className="space-y-1 text-xs">
                                      {turnosSede.map((t) => {
                                        const emp = empleados.find((e) => e.id === t.empleado_id);
                                        return (
                                          <li
                                            key={t.id}
                                            className="flex justify-between items-center bg-white/60 px-2 py-1 rounded gap-1"
                                          >
                                            <span className="font-medium truncate">
                                              {emp?.nombre.split(" ")[0]}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <span className="text-[11px]">
                                                {t.hora_inicio.slice(0, 5)}-{t.hora_fin.slice(0, 5)}
                                              </span>
                                              {usuarioActual.tipo === "admin" && (
                                                <button
                                                  onClick={() => eliminarTurno(t.id)}
                                                  className="text-rose-600 hover:text-rose-800 p-0.5"
                                                  title="Borrar turno"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                  <img 
                    src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                    alt="Cerámica Víctor Morales" 
                    className="h-5 object-contain"
                  />
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-sm text-stone-900">
                      Acumulado Mensual de Turnos Planificados
                    </h2>
                    <input
                      type="month"
                      value={mesExportar}
                      onChange={(e) => setMesExportar(e.target.value)}
                      className="text-xs border border-stone-300 rounded-lg p-1.5"
                    />
                  </div>

                  <div className="divide-y divide-stone-100">
                    {empleados
                      .filter((e) => e.tipo !== "admin")
                      .map((emp) => {
                        const turnosMes = turnos.filter(
                          (t) => t.empleado_id === emp.id && t.fecha.startsWith(mesExportar)
                        );
                        const hNijar = turnosMes
                          .filter((t) => t.ubicacion === "nijar")
                          .reduce((a, b) => a + Number(b.horas_totales), 0);
                        const hSanJose = turnosMes
                          .filter((t) => t.ubicacion === "san_jose")
                          .reduce((a, b) => a + Number(b.horas_totales), 0);
                        const hTaller = turnosMes
                          .filter((t) => t.ubicacion === "taller")
                          .reduce((a, b) => a + Number(b.horas_totales), 0);

                        return (
                          <div key={emp.id} className="py-3 space-y-1">
                            <div className="flex justify-between text-sm font-semibold">
                              <span>{emp.nombre}</span>
                              <span>
                                Total mes: {Number((hNijar + hSanJose + hTaller).toFixed(2))}h
                              </span>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                                Níjar: {Number(hNijar.toFixed(2))}h
                              </span>
                              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900">
                                San José: {Number(hSanJose.toFixed(2))}h
                              </span>
                              <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                                Taller: {Number(hTaller.toFixed(2))}h
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tabActiva === "admin" && usuarioActual.tipo === "admin" && (
          <div className="space-y-6">
            <form
              onSubmit={crearTurnoPlanificado}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
            >
              <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                <img 
                  src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                  alt="Cerámica Víctor Morales" 
                  className="h-5 object-contain"
                />
              </div>
              <div className="p-5 space-y-4">
                <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Añadir Turno al Cuadrante
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Trabajador</label>
                    <select
                      value={adminEmpleadoId}
                      onChange={(e) => setAdminEmpleadoId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                    >
                      {empleados
                        .filter((e) => e.tipo !== "admin")
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Centro asignado</label>
                    <select
                      value={adminSede}
                      onChange={(e) => setAdminSede(e.target.value as Ubicacion)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="nijar">Tienda Níjar</option>
                      <option value="san_jose">Tienda San José</option>
                      <option value="taller">Taller Central</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Fecha de referencia</label>
                    <input
                      type="date"
                      value={adminFecha}
                      onChange={(e) => setAdminFecha(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Aplicar a:</label>
                    <select
                      value={modoCreacionTurno}
                      onChange={(e) => setModoCreacionTurno(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-medium"
                    >
                      <option value="dia">Solo este día exacto</option>
                      <option value="laborables">Toda la semana (Lunes a Viernes)</option>
                      <option value="toda_semana">Toda la semana (Lunes a Domingo)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Entrada</label>
                      <input
                        type="time"
                        value={adminInicio}
                        onChange={(e) => setAdminInicio(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Salida</label>
                      <input
                        type="time"
                        value={adminFin}
                        onChange={(e) => setAdminFin(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-300"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={procesando}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-semibold text-sm hover:bg-stone-800 disabled:opacity-50 transition"
                >
                  {procesando ? "Guardando..." : "Guardar Turno(s) en Cuadrante"}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-center">
                <img 
                  src="https://ceramicavictormorales.com/wp-content/uploads/2025/02/logo-horizontal_blanco-1.png" 
                  alt="Cerámica Víctor Morales" 
                  className="h-5 object-contain"
                />
              </div>
              <div className="p-5 space-y-4">
                <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Histórico de Fichajes y Descarga Excel
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Mes</label>
                    <input
                      type="month"
                      value={mesExportar}
                      onChange={(e) => setMesExportar(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Filtrar Empleado</label>
                    <select
                      value={empleadoExportar}
                      onChange={(e) => setEmpleadoExportar(e.target.value)}
                      className="w-full p-2 rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="todos">Todos los trabajadores</option>
                      {empleados.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={descargarExcelCSV}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" /> Descargar Excel (.CSV)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border-t border-stone-100 pt-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-stone-400 border-b border-stone-100">
                        <th className="pb-2">Empleado</th>
                        <th className="pb-2">Fecha / Sede</th>
                        <th className="pb-2">Horario</th>
                        <th className="pb-2">Estado</th>
                        <th className="pb-2 text-right">Editar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {fichajes
                        .filter(
                          (f) =>
                            f.fecha.startsWith(mesExportar) &&
                            (empleadoExportar === "todos" || f.empleado_id === empleadoExportar)
                        )
                        .map((f) => {
                          const emp = empleados.find((e) => e.id === f.empleado_id);
                          return (
                            <tr key={f.id}>
                              <td className="py-2.5 font-medium">{emp?.nombre}</td>
                              <td className="py-2.5">
                                {f.fecha} · {NOMBRES_SEDE[f.ubicacion]}
                              </td>
                              <td className="py-2.5">
                                {new Date(f.entrada).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {f.salida
                                  ? new Date(f.salida).toLocaleTimeString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Activo"}
                              </td>
                              <td className="py-2.5">
                                {f.editado_manualmente ? (
                                  <span
                                    className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium"
                                    title={f.nota_edicion || ""}
                                  >
                                    Manual: {f.nota_edicion}
                                  </span>
                                ) : (
                                  <span className="text-stone-400">Original</span>
                                )}
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => abrirModalEdicion(f)}
                                  className="p-1.5 hover:bg-stone-100 rounded text-stone-600"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {fichajeEditando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={guardarEdicionManual}
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-base text-stone-900">
              Corregir fichaje del {fichajeEditando.fecha}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Hora Entrada</label>
                <input
                  type="time"
                  required
                  value={nuevaEntrada}
                  onChange={(e) => setNuevaEntrada(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Hora Salida</label>
                <input
                  type="time"
                  required
                  value={nuevaSalida}
                  onChange={(e) => setNuevaSalida(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">
                Motivo del cambio (Obligatorio)
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Olvidé fichar al cerrar la tienda"
                value={motivoEdicion}
                onChange={(e) => setMotivoEdicion(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFichajeEditando(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesando}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium disabled:opacity-50"
              >
                Guardar cambio
              </button>
            </div>
          </form>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 flex justify-around py-2 z-20">
        <button
          onClick={() => setTabActiva("fichar")}
          className={`flex flex-col items-center gap-1 text-xs font-medium px-4 py-1 rounded-xl ${
            tabActiva === "fichar" ? "text-stone-900 font-bold" : "text-stone-400"
          }`}
        >
          <Clock className="w-5 h-5" />
          Fichar
        </button>

        <button
          onClick={() => setTabActiva("horario")}
          className={`flex flex-col items-center gap-1 text-xs font-medium px-4 py-1 rounded-xl ${
            tabActiva === "horario" ? "text-stone-900 font-bold" : "text-stone-400"
          }`}
        >
          <Calendar className="w-5 h-5" />
          Cuadrante
        </button>

        {usuarioActual.tipo === "admin" && (
          <button
            onClick={() => setTabActiva("admin")}
            className={`flex flex-col items-center gap-1 text-xs font-medium px-4 py-1 rounded-xl ${
              tabActiva === "admin" ? "text-stone-900 font-bold" : "text-stone-400"
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            Jefe / Excel
          </button>
        )}
      </nav>
    </div>
  );
}