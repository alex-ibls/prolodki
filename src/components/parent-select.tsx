import { inputClass } from "@/components/styles";
import { flattenCategories, type CategoryNode } from "@/lib/taxonomy";

export function ParentSelect({
  categories,
  currentId,
  value,
}: {
  categories: CategoryNode[];
  currentId?: number;
  value?: number | null;
}) {
  return (
    <select name="parentId" defaultValue={value ?? ""} className={inputClass}>
      <option value="">Корень каталога</option>
      {flattenCategories(categories).map(({ category, depth }) => (
        <option key={category.id} value={category.id} disabled={category.id === currentId}>
          {"— ".repeat(depth)}
          {category.name}
        </option>
      ))}
    </select>
  );
}
