# Soyuz Backend

Backend profesional con enfoque DevSecOps.

## Requisitos
- Node.js
- PostgreSQL
- Variables de entorno configuradas

## Variables
- `.env` para desarrollo
- `.env.test` para pruebas

## Scripts
- `npm run dev` → desarrollo
- `npm start` → arranque normal
- `npm run migrate:up` → aplicar migraciones
- `npm run migrate:down` → revertir migración
- `npm run test:prepare` → aplicar migraciones a DB de pruebas
- `npm test` → ejecutar tests
- `npm run test:watch` → tests en watch
- `npm run lint` → revisión estática

## Base de datos de pruebas
Usa una DB separada, por ejemplo: `soyuz_test_db`.

## Endpoints principales

### Health
`GET /api/health`

### Ready
`GET /api/ready`

### Contact
`POST /api/contact`

Body:
```json
{
  "name": "Juan Pérez",
  "email": "juan@test.com",
  "subject": "Hola",
  "message": "Quiero información",
  "website": ""
}