// Группы меток для фильтров каталога. Новую группу (например, «Материал»)
// достаточно добавить сюда — она сразу появится в админке и в фильтрах,
// как только в ней заведут хотя бы одну метку с товарами.
export const TAG_GROUPS = [
  { key: 'season', title: 'Сезон' },
  { key: 'purpose', title: 'Назначение' },
  { key: 'collection', title: 'Коллекция' },
]

export const TAG_GROUP_KEYS = TAG_GROUPS.map((g) => g.key)

export function tagGroupTitle(key) {
  return TAG_GROUPS.find((g) => g.key === key)?.title || key
}
