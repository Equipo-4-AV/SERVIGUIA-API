# ServiGuía Demo

Frontend demo for a home-services diagnosis assistant. Built with React + TypeScript + Vite + Tailwind, ready to connect to a Python (FastAPI) REST API.

## Configuración de la API

La configuración vive en `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_MODE=sync
```

- **Cambiar la URL del backend**: edita `VITE_API_BASE_URL` y reinicia el dev server.
- **Modo síncrono (`sync`)**: hace `POST` directo a `/api/diagnostico` y espera la respuesta.
- **Modo asíncrono (`async`)**: hace `POST` a `/kickoff`, hace polling cada 2s a `/status/:taskId` y al terminar trae el resultado de `/output/:taskId`.

## Dónde reemplazar los mocks

- `src/services/api.ts` → punto de entrada `requestDiagnosis()`. Si la API falla, hace fallback a `buildMockDiagnosis()` para que la demo nunca se rompa. Cuando el backend esté listo y responda con la forma de `DiagnosisResponse`, no hay que tocar nada del UI.
- `src/services/mockData.ts` → datos de ejemplo (proveedores, escenarios). Borrar o ajustar según convenga.
- `src/types/index.ts` → contratos compartidos con el backend. Mantener sincronizados con el modelo Pydantic.

## Estructura

```
src/
  components/        UI (Chat, MessageBubble, ProviderCard, EmergencyAlert, JsonPreview, ExamplePrompts, UrgencyBadge)
  services/api.ts    Capa de servicios — única zona que habla con el backend
  services/mockData  Fallback para presentaciones sin backend
  types/index.ts     Interfaces TypeScript compartidas
  routes/index.tsx   Layout principal de la demo
```

El payload que se envía al backend es `multipart/form-data` con `text`, `history` (JSON string) y `image` opcional — listo para `UploadFile` de FastAPI.