-- ====================================================================
-- QuantumGeoRescue AI - Script de Inicialización de Base de Datos
-- Motor: PostgreSQL 14+ con Extensión Espacial PostGIS
-- ====================================================================

-- 1. Habilitar extensión espacial PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla de Usuarios (Soporte B2C Ciudadano y B2G Centro de Mando)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'ciudadano',
    institucion VARCHAR(120) NOT NULL DEFAULT 'individual',
    permisos VARCHAR(500) NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    codigo_enlace VARCHAR(50) UNIQUE NOT NULL,    -- Código para vinculación familiar
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(usuario);

-- 3. Tabla de Red de Protección Familiar
CREATE TABLE IF NOT EXISTS red_familiar (
    id SERIAL PRIMARY KEY,
    usuario_responsable VARCHAR(100) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    parentesco VARCHAR(80) NOT NULL,
    dispositivo_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_red_familiar_responsable ON red_familiar(usuario_responsable);

CREATE TABLE IF NOT EXISTS institution_invites (
    id SERIAL PRIMARY KEY,
    institution_name VARCHAR(120) NOT NULL,
    member_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    role VARCHAR(60) NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_institution_invites_institution ON institution_invites (institution_name);

CREATE TABLE IF NOT EXISTS institution_applications (
    id SERIAL PRIMARY KEY,
    institution_name VARCHAR(120) NOT NULL,
    ruc VARCHAR(11) UNIQUE NOT NULL,
    institution_type VARCHAR(60) NOT NULL,
    region VARCHAR(100) NOT NULL,
    official_email VARCHAR(200) NOT NULL,
    contact_name VARCHAR(120) NOT NULL,
    contact_phone VARCHAR(40) NOT NULL,
    evidence_url VARCHAR(500) NOT NULL,
    applicant_username VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verification_source VARCHAR(500),
    review_notes TEXT,
    reviewed_by VARCHAR(120),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_institution_applications_status ON institution_applications (status);

CREATE TABLE IF NOT EXISTS platform_admin_accounts (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    password_updated_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Alertas de Emergencia con Geometría PostGIS (SRID 4326 - WGS84)
CREATE TABLE IF NOT EXISTS alertas_emergencia (
    id SERIAL PRIMARY KEY,
    dispositivo_id VARCHAR(100) NOT NULL,
    usuario VARCHAR(100),
    tipo_emergencia VARCHAR(150) NOT NULL,
    nivel_gravedad INTEGER NOT NULL,
    origen_alerta VARCHAR(50) DEFAULT 'MANUAL' NOT NULL,        -- 'MANUAL' o 'AUTOMATICO_INERCIA'
    estado_confirmacion VARCHAR(50) DEFAULT 'CONFIRMADO' NOT NULL, -- 'CONFIRMADO', 'EXPIRADO_INCONSCIENTE'
    ubicacion GEOMETRY(Point, 4326) NOT NULL,
    timestamp_dispositivo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sincronizado BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índice espacial GiST para consultas geoespaciales de alta velocidad
CREATE INDEX IF NOT EXISTS idx_alertas_ubicacion ON alertas_emergencia USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS idx_alertas_dispositivo ON alertas_emergencia (dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_creado_en ON alertas_emergencia (creado_en DESC);
