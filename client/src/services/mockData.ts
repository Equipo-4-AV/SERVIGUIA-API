import type { DiagnosisResponse, Provider } from "@/types";

const PROVIDERS: Record<string, Provider[]> = {
  gas: [
    {
      id: "p001",
      nombre: "GasSafe Express",
      categoria: "Gas y emergencias",
      rating: 4.9,
      badges: ["Certificado", "24/7", "Verificado"],
      rango_precio: "$$",
      disponibilidad: "Disponible ahora",
    },
  ],
  plomeria: [
    {
      id: "p002",
      nombre: "TecniHogar Pro",
      categoria: "Plomería",
      rating: 4.7,
      badges: ["Garantía", "Verificado"],
      rango_precio: "$$",
      disponibilidad: "Hoy desde las 14:00",
    },
    {
      id: "p005",
      nombre: "Plomeros Andinos",
      categoria: "Plomería",
      rating: 4.6,
      badges: ["Económico", "Verificado"],
      rango_precio: "$",
      disponibilidad: "Mañana 8:00 AM",
    },
  ],
  clima: [
    {
      id: "p003",
      nombre: "Climatización Andes",
      categoria: "Aire acondicionado",
      rating: 4.8,
      badges: ["Especialista", "Garantía 1 año"],
      rango_precio: "$$$",
      disponibilidad: "Mañana 9:00 AM",
    },
    {
      id: "p006",
      nombre: "FríoTotal Service",
      categoria: "Aire acondicionado",
      rating: 4.5,
      badges: ["Certificado"],
      rango_precio: "$$",
      disponibilidad: "Mañana 11:00 AM",
    },
  ],
};

function baseResponse(text: string, hasImage: boolean, turn: number): DiagnosisResponse {
  return {
    status: "ready",
    stage: "done",
    input_summary: { texto: text, tiene_imagen: hasImage, turno: turn },
    emergency_analysis: {
      is_emergency: false,
      nivel_urgencia: "NORMAL",
      accion_inmediata: null,
      numero_emergencia: null,
      motivo: "No se detectaron señales de riesgo inmediato.",
    },
    diagnosis: null,
    recommendation: { ready: false, motivo_no_listo: null, proveedores: [] },
  };
}

export function buildMockDiagnosis(
  text: string,
  hasImage = false,
  turn = 1,
): DiagnosisResponse {
  const lower = text.toLowerCase();

  // 1) Emergency: gas
  if (lower.includes("gas") || lower.includes("huele")) {
    return {
      status: "emergency",
      stage: "emergency_check",
      input_summary: { texto: text, tiene_imagen: hasImage, turno: turn },
      emergency_analysis: {
        is_emergency: true,
        nivel_urgencia: "CRÍTICO",
        accion_inmediata:
          "Sal de inmediato del lugar. No enciendas luces ni aparatos eléctricos. Cierra la llave de gas si es seguro y llama al 911.",
        numero_emergencia: "911",
        motivo: "Posible fuga de gas reportada por el usuario.",
      },
      diagnosis: null,
      recommendation: {
        ready: false,
        motivo_no_listo: "Caso clasificado como emergencia: se prioriza atención de emergencias antes que recomendaciones.",
        proveedores: [],
      },
    };
  }

  // 2) Ambiguous case → follow-up
  if (
    lower.includes("baño") ||
    lower.includes("descompuso") ||
    lower.includes("algo") ||
    lower.length < 25
  ) {
    if (turn < 2) {
      const r = baseResponse(text, hasImage, turn);
      r.status = "needs_input";
      r.stage = "follow_up";
      r.diagnosis = {
        categoria: "Hogar (sin clasificar)",
        subcategoria: null,
        resumen: "La descripción no es suficiente para clasificar el problema con confianza.",
        confianza: 0.45,
        pregunta_seguimiento:
          "¿Qué parte específica está fallando? (ej. inodoro, ducha, lavamanos) y ¿hay agua presente?",
      };
      r.recommendation.motivo_no_listo =
        "Se necesita una respuesta a la pregunta de seguimiento antes de recomendar proveedores.";
      return r;
    }
  }

  // 3) Plumbing — successful classification + recommendation
  if (lower.includes("agua") || lower.includes("fregadero") || lower.includes("fuga") || lower.includes("inodoro")) {
    const r = baseResponse(text, hasImage, turn);
    r.status = "ready";
    r.stage = "done";
    r.emergency_analysis.nivel_urgencia = "MODERADO";
    r.emergency_analysis.accion_inmediata =
      "Cierra la llave de paso del agua para evitar más daños mientras llega el técnico.";
    r.diagnosis = {
      categoria: "Plomería",
      subcategoria: "Fuga en punto fijo",
      resumen:
        "Problema de plomería con potencial daño por agua. Requiere atención hoy mismo para prevenir filtraciones mayores.",
      confianza: 0.88,
      pregunta_seguimiento: null,
    };
    r.recommendation = {
      ready: true,
      motivo_no_listo: null,
      proveedores: PROVIDERS.plomeria,
    };
    return r;
  }

  // 4) Air conditioning — successful classification + recommendation
  if (lower.includes("aire") || lower.includes("enfría") || lower.includes("enfria") || lower.includes("clima")) {
    const r = baseResponse(text, hasImage, turn);
    r.diagnosis = {
      categoria: "Climatización",
      subcategoria: "Aire acondicionado — bajo rendimiento",
      resumen:
        "Posible falla en el sistema de refrigeración: gas refrigerante bajo, filtros sucios o falla en el compresor.",
      confianza: 0.82,
      pregunta_seguimiento: null,
    };
    r.recommendation = {
      ready: true,
      motivo_no_listo: null,
      proveedores: PROVIDERS.clima,
    };
    return r;
  }

  // Default — request more info
  const r = baseResponse(text, hasImage, turn);
  r.status = "needs_input";
  r.stage = "follow_up";
  r.diagnosis = {
    categoria: "Servicio general del hogar",
    subcategoria: null,
    resumen: "Hemos registrado tu solicitud. Necesitamos más detalle para clasificar el servicio.",
    confianza: 0.3,
    pregunta_seguimiento: "¿Puedes describir con más detalle qué está fallando y desde cuándo?",
  };
  r.recommendation.motivo_no_listo =
    "Se necesita más información para clasificar el problema antes de recomendar proveedores.";
  return r;
}
