CREATE TYPE "public"."metodo_caracterizacion" AS ENUM('cuestionario', 'croquis', 'mapa');--> statement-breakpoint
CREATE TYPE "public"."subtipo_flores" AS ENUM('flora_espontanea', 'borde_silvestre', 'banda_implantada', 'vegetacion_natural');--> statement-breakpoint
CREATE TYPE "public"."tipo_sector" AS ENUM('cultivo', 'sector_flores');--> statement-breakpoint
CREATE TYPE "public"."ubicacion_relativa" AS ENUM('arriba_izquierda', 'arriba_centro', 'arriba_derecha', 'centro_izquierda', 'centro', 'centro_derecha', 'abajo_izquierda', 'abajo_centro', 'abajo_derecha');--> statement-breakpoint
CREATE TABLE "cultivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cultivo_clave_unique" UNIQUE("clave"),
	CONSTRAINT "cultivo_clave_normalizada" CHECK ("cultivo"."clave" = lower(btrim("cultivo"."clave")) AND length("cultivo"."clave") > 0)
);
--> statement-breakpoint
CREATE TABLE "establecimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text NOT NULL,
	"departamento" text NOT NULL,
	"localidad" text NOT NULL,
	"localidad_es_otra" boolean DEFAULT false NOT NULL,
	"ecorregion" text NOT NULL,
	"superficie_total_ha" numeric(12, 4),
	"metodo_caracterizacion" "metodo_caracterizacion" NOT NULL,
	"contorno" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "establecimiento_departamento_valido" CHECK ("establecimiento"."departamento" IN ('El Carmen', 'Dr. Manuel Belgrano', 'Palpalá', 'San Antonio', 'San Pedro', 'Ledesma', 'Santa Bárbara', 'Tilcara', 'Tumbaya', 'Humahuaca', 'Valle Grande', 'Cochinoca', 'Yavi', 'Susques', 'Rinconada', 'Santa Catalina')),
	CONSTRAINT "establecimiento_ecorregion_valida" CHECK ("establecimiento"."ecorregion" IN ('valles_templados', 'quebrada_de_humahuaca', 'yungas', 'puna', 'chaco_seco')),
	CONSTRAINT "establecimiento_superficie_positiva" CHECK ("establecimiento"."superficie_total_ha" IS NULL OR "establecimiento"."superficie_total_ha" > 0),
	CONSTRAINT "establecimiento_superficie_segun_metodo" CHECK ("establecimiento"."metodo_caracterizacion" = 'mapa' OR "establecimiento"."superficie_total_ha" IS NOT NULL),
	CONSTRAINT "establecimiento_contorno_solo_mapa" CHECK ("establecimiento"."metodo_caracterizacion" = 'mapa' OR "establecimiento"."contorno" IS NULL),
	CONSTRAINT "establecimiento_version_positiva" CHECK ("establecimiento"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "sector" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"tipo" "tipo_sector" NOT NULL,
	"cultivo_id" uuid,
	"cultivo_otro" text,
	"subtipo_flores" "subtipo_flores",
	"nombre" text NOT NULL,
	"superficie_ha" numeric(12, 4) NOT NULL,
	"ubicacion_relativa" "ubicacion_relativa",
	"geometria" jsonb,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sector_superficie_positiva" CHECK ("sector"."superficie_ha" > 0),
	CONSTRAINT "sector_coherencia_tipo" CHECK ((
        "sector"."tipo" = 'cultivo'
        AND (
          ("sector"."cultivo_id" IS NOT NULL AND "sector"."cultivo_otro" IS NULL)
          OR ("sector"."cultivo_id" IS NULL AND "sector"."cultivo_otro" IS NOT NULL AND length(btrim("sector"."cultivo_otro")) > 0)
        )
        AND "sector"."subtipo_flores" IS NULL
      ) OR (
        "sector"."tipo" = 'sector_flores'
        AND "sector"."cultivo_id" IS NULL
        AND "sector"."cultivo_otro" IS NULL
      ))
);
--> statement-breakpoint
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sector" ADD CONSTRAINT "sector_establecimiento_id_establecimiento_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "public"."establecimiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sector" ADD CONSTRAINT "sector_cultivo_id_cultivo_id_fk" FOREIGN KEY ("cultivo_id") REFERENCES "public"."cultivo"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "establecimiento_usuario_id_idx" ON "establecimiento" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "establecimiento_usuario_nombre_unico_idx" ON "establecimiento" USING btree ("usuario_id",lower("nombre"));--> statement-breakpoint
CREATE INDEX "sector_establecimiento_id_idx" ON "sector" USING btree ("establecimiento_id");--> statement-breakpoint
INSERT INTO "cultivo" ("clave", "nombre", "activo") VALUES
	('frutilla', 'Frutilla', true),
	('arandano', 'Arándano', true),
	('durazno', 'Durazno', true),
	('tomate', 'Tomate', true),
	('pimiento', 'Pimiento', true),
	('palta', 'Palta', true),
	('citricos', 'Cítricos', true),
	('zapallo', 'Zapallo y cucurbitáceas', true),
	('horticolas', 'Hortícolas mixtas', true)
ON CONFLICT ("clave") DO NOTHING;
