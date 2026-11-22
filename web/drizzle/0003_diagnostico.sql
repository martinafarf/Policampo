CREATE TYPE "public"."nivel_riesgo" AS ENUM('adecuado', 'moderado', 'critico');--> statement-breakpoint
CREATE TABLE "diagnostico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establecimiento_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"version_reglas" text NOT NULL,
	"entrada" jsonb NOT NULL,
	"superficie_total_ha" numeric(12, 4) NOT NULL,
	"superficie_flores_ha" numeric(12, 4) NOT NULL,
	"superficie_cultivos_ha" numeric(12, 4) NOT NULL,
	"superficie_sin_asignar_ha" numeric(12, 4) NOT NULL,
	"hectareas_a_compensar" numeric(12, 4) NOT NULL,
	"porcentaje_flores" numeric(5, 1) NOT NULL,
	"deficit_pp" numeric(5, 1) NOT NULL,
	"nivel_riesgo" "nivel_riesgo" NOT NULL,
	"perimetro_m" numeric(10, 1),
	"ancho_franja_m" numeric(10, 1),
	"areas_aptas" jsonb NOT NULL,
	"superficie_libre" jsonb,
	"alertas" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagnostico" ADD CONSTRAINT "diagnostico_establecimiento_id_establecimiento_id_fk" FOREIGN KEY ("establecimiento_id") REFERENCES "public"."establecimiento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostico_establecimiento_creado_idx" ON "diagnostico" USING btree ("establecimiento_id","creado_en" desc);