# GRIDBOT

Simulador de robots sobre una cuadrícula con frontend, backend y motor de simulación compartido.

## Estructura

- `frontend`: interfaz principal del sistema.
- `backend`: API, lógica de negocio y WebSocket.
- `packages/simulation-engine`: motor reutilizable de simulación.
- `database/prisma`: esquema, migraciones y seed de base de datos.

## Ramas

- `main`: base estable del repositorio.
- `develop`: integración de cambios pequeños y evolutivos.
- `release`: preparación de entregas y validaciones previas a publicación.

## Puesta en marcha

```bash
npm install
docker compose up -d
```

Consulta también `MANUAL_INSTALACION_LOCAL.md` para una guía más detallada.
