import { buttonClass, inputClass } from "@/components/styles";

type Row = {
  id: number;
  name: string;
  unit: string;
  dataType: string;
  sort: number;
  filterable?: boolean;
};

export function CharacteristicForm({
  action,
  title,
  hint,
  rows,
  showFilter,
  nextSort,
  hidden,
  emptyText = "Пока нет характеристик.",
}: {
  action: (formData: FormData) => Promise<void>;
  title: string;
  hint: string;
  rows: Row[];
  showFilter: boolean;
  nextSort: number;
  hidden?: { name: string; value: string }[];
  emptyText?: string;
}) {
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-card p-4">
      {hidden?.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <div>
        <h2 className="text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">{emptyText}</p> : null}
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 border-t border-line pt-3 md:grid-cols-[minmax(0,1.4fr)_7rem_8rem_5rem_auto]">
          <input type="hidden" name="defId" value={row.id} />
          <label className="text-sm">
            Название
            <input name="defName" required defaultValue={row.name} maxLength={80} className={inputClass} />
          </label>
          <label className="text-sm">
            Единица
            <input name="defUnit" defaultValue={row.unit} maxLength={16} className={inputClass} />
          </label>
          <label className="text-sm">
            Тип
            <select name="defType" defaultValue={row.dataType === "text" ? "text" : "number"} className={inputClass}>
              <option value="number">Число</option>
              <option value="text">Текст</option>
            </select>
          </label>
          <label className="text-sm">
            Порядок
            <input name="defSort" defaultValue={row.sort} inputMode="numeric" className={inputClass} />
          </label>
          <div className="flex flex-wrap items-end gap-3 pb-2 text-sm">
            {showFilter ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" name="defFilter" value={row.id} defaultChecked={row.filterable} className="h-4 w-4" />
                В фильтре
              </label>
            ) : null}
            <label className="flex items-center gap-2">
              <input type="checkbox" name="defDelete" value={row.id} className="h-4 w-4" />
              Удалить
            </label>
          </div>
        </div>
      ))}
      <div className="grid gap-3 border-t border-line pt-3 md:grid-cols-[minmax(0,1.4fr)_7rem_8rem_5rem_auto]">
        <label className="text-sm">
          Новая характеристика
          <input name="newName" maxLength={80} className={inputClass} />
        </label>
        <label className="text-sm">
          Единица
          <input name="newUnit" maxLength={16} className={inputClass} />
        </label>
        <label className="text-sm">
          Тип
          <select name="newType" defaultValue="number" className={inputClass}>
            <option value="number">Число</option>
            <option value="text">Текст</option>
          </select>
        </label>
        <label className="text-sm">
          Порядок
          <input name="newSort" defaultValue={nextSort} inputMode="numeric" className={inputClass} />
        </label>
        {showFilter ? (
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="newFilter" value="1" className="h-4 w-4" />
            В фильтре
          </label>
        ) : (
          <span />
        )}
      </div>
      <button className={`${buttonClass} w-fit`}>Сохранить характеристики</button>
    </form>
  );
}
