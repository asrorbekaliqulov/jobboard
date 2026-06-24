-- ============================================================================
-- ISH TURLARI (professions) ro'yxatini eksport qilish
-- ============================================================================
-- Maqsad: hozir bazadagi barcha kasblarni (va kategoriyalarni) ko'rib,
-- ularni qaysi guruhga (parent/category) tegishli ekanini tahlil qilish.
--
-- Ishlatish (serverda, docker-compose bilan):
--   docker compose exec -T db psql -U <USER> -d <DB> -f - < backend/scripts/export_professions.sql
-- yoki to'g'ridan-to'g'ri psql ichida:
--   \i backend/scripts/export_professions.sql
--
-- Eslatma: <USER> va <DB> ni .env dagi POSTGRES_USER / POSTGRES_DB bilan
-- almashtiring (odatda "postgres").
-- ============================================================================

\echo '================== KATEGORIYALAR =================='
SELECT
    id,
    name_uz,
    name_ru,
    name_en,
    is_active
FROM profession_categories
ORDER BY id;

\echo ''
\echo '================== KASBLAR (parent/category bilan) =================='
SELECT
    p.id,
    p.name_uz                         AS kasb_uz,
    p.parent_id,
    par.name_uz                       AS parent_uz,
    p.category_id,
    c.name_uz                         AS category_uz,
    p.is_active
FROM professions p
LEFT JOIN professions par             ON par.id = p.parent_id
LEFT JOIN profession_categories c     ON c.id   = p.category_id
ORDER BY
    COALESCE(p.parent_id, p.id),  -- bolalarni ota yoniga to'playdi
    p.parent_id NULLS FIRST,
    p.id;

\echo ''
\echo '================== ODDIY RO''YXAT (faqat nomlar) =================='
-- AI ga berish uchun eng qulay, sodda ro'yxat: "id | nom | parent_id"
SELECT
    p.id || ' | ' || p.name_uz || ' | parent=' || COALESCE(p.parent_id::text, '-')
        || ' | cat=' || COALESCE(p.category_id::text, '-') AS qator
FROM professions p
ORDER BY COALESCE(p.parent_id, p.id), p.id;

\echo ''
\echo '================== STATISTIKA =================='
SELECT
    (SELECT COUNT(*) FROM professions)                              AS jami_kasblar,
    (SELECT COUNT(*) FROM professions WHERE parent_id IS NULL)      AS ota_kasblar,
    (SELECT COUNT(*) FROM professions WHERE parent_id IS NOT NULL)  AS bola_kasblar,
    (SELECT COUNT(*) FROM profession_categories)                    AS kategoriyalar;
