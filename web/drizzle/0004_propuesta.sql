CREATE TYPE "public"."disposicion_propuesta" AS ENUM('superficie_libre', 'perimetral', 'transversal', 'islas', 'matriz', 'texto');--> statement-breakpoint
CREATE TABLE "propuesta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"diagnostico_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"nombre" text,
	"version_reglas" text NOT NULL,
	"elegida" boolean DEFAULT false NOT NULL,
	"objetivo_pct" numeric(4, 1) NOT NULL,
	"disposicion" "disposicion_propuesta" NOT NULL,
	"parametros" jsonb NOT NULL,
	"franjas" jsonb,
	"reparto" jsonb,
	"editada_a_mano" boolean DEFAULT false NOT NULL,
	"superficie_franjas_ha" numeric(12, 4) NOT NULL,
	"superficie_libre_usada_ha" numeric(12, 4) NOT NULL,
	"porcentaje_logrado" numeric(5, 1) NOT NULL,
	"perdida_por_cultivo" jsonb NOT NULL,
	"floracion" jsonb NOT NULL,
	"avisos" jsonb NOT NULL,
	CONSTRAINT "propuesta_objetivo_rango" CHECK ("propuesta"."objetivo_pct" BETWEEN 10 AND 40),
	CONSTRAINT "propuesta_nombre_largo" CHECK ("propuesta"."nombre" IS NULL OR length("propuesta"."nombre") <= 60)
);
--> statement-breakpoint
CREATE TABLE "propuesta_especie" (
	"propuesta_id" uuid NOT NULL,
	"planta_id" uuid NOT NULL,
	"proporcion_pct" numeric(4, 1) NOT NULL,
	"orden" integer NOT NULL,
	"copia" jsonb NOT NULL,
	CONSTRAINT "propuesta_especie_propuesta_id_planta_id_pk" PRIMARY KEY("propuesta_id","planta_id")
);
--> statement-breakpoint
ALTER TABLE "propuesta" ADD CONSTRAINT "propuesta_establecimiento_id_establecimiento_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "public"."establecimiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuesta" ADD CONSTRAINT "propuesta_diagnostico_id_diagnostico_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnostico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuesta_especie" ADD CONSTRAINT "propuesta_especie_propuesta_id_propuesta_id_fk" FOREIGN KEY ("propuesta_id") REFERENCES "public"."propuesta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propuesta_especie" ADD CONSTRAINT "propuesta_especie_planta_id_planta_servicio_id_fk" FOREIGN KEY ("planta_id") REFERENCES "public"."planta_servicio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "propuesta_establecimiento_creado_idx" ON "propuesta" USING btree ("establecimiento_id","creado_en" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "propuesta_una_elegida_por_finca_idx" ON "propuesta" USING btree ("establecimiento_id") WHERE "propuesta"."elegida" = true;--> statement-breakpoint
CREATE INDEX "propuesta_especie_planta_idx" ON "propuesta_especie" USING btree ("planta_id");