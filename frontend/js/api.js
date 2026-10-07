// Servicio de conexión con la API FastAPI de QuantumGeoRescue
const ApiService = {
    hostActivo: null,

    // El backend responde errores en tres formatos distintos:
    //  - excepciones de dominio:  { error: true, codigo, mensaje }
    //  - HTTPException:           { detail: "texto" }
    //  - validación (422):        { detail: [ { loc, msg }, ... ] }
    extraerMensajeError(data, status) {
        if (data && typeof data === 'object') {
            if (typeof data.mensaje === 'string' && data.mensaje) return data.mensaje;
            if (typeof data.detail === 'string' && data.detail) return data.detail;
            if (Array.isArray(data.detail) && data.detail.length) {
                return data.detail.map((item) => {
                    const campo = Array.isArray(item.loc) ? item.loc.filter((parte) => parte !== 'body').join('.') : '';
                    return campo ? `${campo}: ${item.msg}` : String(item.msg || '');
                }).join(' | ');
            }
        }
        if (typeof data === 'string' && data) return data;
        return `Error en el servidor (HTTP ${status})`;
    },

    async request(endpoint, options = {}) {
        let ultimoError = null;

        // Primero el host que ya respondió antes, para no reintentar puertos apagados en cada llamada.
        const hosts = this.hostActivo
            ? [this.hostActivo, ...CONFIG.API_HOSTS.filter((item) => item !== this.hostActivo)]
            : CONFIG.API_HOSTS;

        for (const host of hosts) {
            const urlConPrefijo = `${host}${CONFIG.API_PREFIX}${endpoint}`;
            const urlSinPrefijo = `${host}${endpoint}`;

            for (const url of [urlConPrefijo, urlSinPrefijo]) {
                try {
                    const response = await fetch(url, {
                        ...options,
                        headers: {
                            'Content-Type': 'application/json',
                            ...(localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)
                                ? { Authorization: `Bearer ${localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)}` }
                                : {}),
                            ...options.headers
                        }
                    });

                    let data = null;
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        data = null;
                    }
                    if (!response.ok) {
                        const error = new Error(this.extraerMensajeError(data, response.status));
                        error.status = response.status;
                        error.esRespuestaHttp = true;
                        throw error;
                    }
                    this.hostActivo = host;
                    return data;
                } catch (err) {
                    ultimoError = err;
                    // Si el servidor respondió (aunque sea con 4xx/5xx) no es un error de red: se muestra tal cual.
                    if (err.esRespuestaHttp) {
                        throw err;
                    }
                }
            }
        }

        // Si fallaron todos los hosts (servidor apagado)
        throw new Error("No se pudo conectar con el Backend (FastAPI). Inícialo con: uvicorn main:app --reload --port 8001 (también se acepta el 8000)");
    },

    async verificarSalud() {
        for (const host of CONFIG.API_HOSTS) {
            try {
                const res = await fetch(`${host}/`);
                if (res.ok) {
                    this.hostActivo = host;
                    return await res.json();
                }
            } catch (e) {}
        }
        throw new Error("Servidor offline");
    },

    async registrarUsuario(payload) {
        return this.request('/auth/registro/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async loginUsuario(payload) {
        return this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async verificarSesion() {
        return this.request('/auth/me/');
    },

    async aceptarInvitacionInstitucional(payload) {
        return this.request('/auth/invitaciones/aceptar/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async registrarFamiliar(payload) {
        return this.request('/familia/agregar/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async listarFamiliares(usuario) {
        return this.request(`/familia/listar/${encodeURIComponent(usuario)}`);
    },

    async despacharAlerta(payload) {
        return this.request('/alertas/despachar/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async alertaCoaccion(payload) {
        return this.request('/coaccion/alertar/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async obtenerAlertasActivas() {
        return this.request('/alertas/activas/');
    },

    async calcularRuta(payload) {
        return this.request('/rescate/calcular-ruta/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async enviarAlertaSeguridad(payload) {
        return this.request('/security/anti-theft-alert', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async listarPlanes() {
        return this.request('/subscriptions/plans');
    },

    async iniciarCheckoutPlan(payload) {
        return this.request('/subscriptions/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async confirmarCheckout(sessionId) {
        return this.request('/subscriptions/checkout/confirm', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
    },

    async obtenerMiPlan() {
        return this.request('/subscriptions/me');
    },

    async obtenerDatosDePago() {
        return this.request('/subscriptions/payment-info');
    },

    async agregarUsuarioInstitucional(payload) {
        return this.request('/subscriptions/institutions/members', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async listarUsuariosInstitucionales() {
        // La institución sale del token; así no depende de que el nombre viaje bien en la URL.
        return this.request('/subscriptions/institutions/me/members');
    },

    async obtenerCuentaInstitucional() {
        return this.request('/subscriptions/institutions/me');
    },

    async actualizarMiembroInstitucional(memberId, payload) {
        return this.request(`/subscriptions/institutions/me/members/${memberId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
    },

    async actualizarPlanInstitucional(planCode) {
        return this.request('/subscriptions/institutions/me/plan', {
            method: 'PUT',
            body: JSON.stringify({ plan_code: planCode })
        });
    },

    async loginPropietarios(accessKey) {
        return this.request('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ access_key: accessKey })
        });
    },

    async cambiarContrasenaPropietarios(payload) {
        const token = sessionStorage.getItem('qgeo_owner_token');
        return this.request('/admin/change-password', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
    },

    async listarSolicitudesInstitucionales(statusFilter = 'pending') {
        const token = sessionStorage.getItem('qgeo_owner_token');
        return this.request(`/admin/institution-applications?status_filter=${encodeURIComponent(statusFilter)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    async revisarSolicitudInstitucional(applicationId, action, payload) {
        const token = sessionStorage.getItem('qgeo_owner_token');
        return this.request(`/admin/institution-applications/${applicationId}/${action}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
    },

    async listarPagosPorValidar() {
        const token = sessionStorage.getItem('qgeo_owner_token');
        return this.request('/admin/payments?status_filter=manual_review', {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    async revisarPago(paymentId, action) {
        const token = sessionStorage.getItem('qgeo_owner_token');
        return this.request(`/admin/payments/${paymentId}/${action}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};
