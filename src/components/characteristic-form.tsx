import { buttonClass, inputClass } from "@/components/styles";
import { IconPicker } from "@/components/icon-picker";

type Row = {
  id: number;
  name: string;
  unit: string;
  dataType: string;
  sort: number;
  filterable?: boolean;
  featured?: boolean;
  icon?: string;
};

const fields = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[9.5rem_minmax(0,1fr)_6.5rem_8rem_5rem] lg:items-start";

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
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-card p-4">
      {hidden?.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <div>
        <h2 className="text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">{emptyText}</p> : null}
      <div className="grid gap-3">
        {rows.map((row) => (
          <CharacteristicFields
            key={row.id}
            id={row.id}
            name={row.name}
            unit={row.unit}
            dataType={row.dataType}
            sort={row.sort}
            icon={row.icon || ""}
            filterable={row.filterable}
            featured={row.featured}
            showFilter={showFilter}
          />
        ))}
      </div>
      <div className="grid gap-3 border-t border-line pt-4">
        <h3 className="text-base font-semibold text-deep">Новая характеристика</h3>
        <CharacteristicFields
          name=""
          unit=""
          dataType="number"
          sort={nextSort}
          icon=""
          showFilter={showFilter}
          fresh
        />
      </div>
      <button className={`${buttonClass} w-fit`}>Сохранить характеристики</button>
    </form>
  );
}

function CharacteristicFields({
  id,
  name,
  unit,
  dataType,
  sort,
  icon,
  filterable,
  featured,
  showFilter,
  fresh = false,
}: {
  id?: number;
  name: string;
  unit: string;
  dataType: string;
  sort: number;
  icon: string;
  filterable?: boolean;
  featured?: boolean;
  showFilter: boolean;
  fresh?: boolean;
}) {
  const prefix = fresh ? "new" : "def";
  return (
    <div className={`${fresh ? "" : "rounded-md border border-line bg-white p-3"} grid gap-3`}>
      {id !== undefined ? <input type="hidden" name="defId" value={id} /> : null}
      <div className={fields}>
        <div className="text-sm sm:col-span-2 lg:col-span-1">
          Иконка
          <IconPicker name={`${prefix}Icon`} value={icon} />
        </div>
        <label className="text-sm">
          Название
          <input name={`${prefix}Name`} required={!fresh} defaultValue={name} maxLength={80} className={inputClass} />
        </label>
        <label className="text-sm">
          Единица
          <input name={`${prefix}Unit`} defaultValue={unit} maxLength={16} className={inputClass} />
        </label>
        <label className="text-sm">
          Тип
          <select name={`${prefix}Type`} defaultValue={dataType === "text" ? "text" : "number"} className={inputClass}>
            <option value="number">Число</option>
            <option value="text">Текст</option>
          </select>
        </label>
        <label className="text-sm">
          Порядок
          <input name={`${prefix}Sort`} defaultValue={sort} inputMode="numeric" className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {showFilter ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name={fresh ? "newFilter" : "defFilter"}
              value={fresh ? "1" : String(id)}
              defaultChecked={filterable}
              className="h-4 w-4"
            />
            В фильтре
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name={fresh ? "newFeatured" : "defFeatured"}
            value={fresh ? "1" : String(id)}
            defaultChecked={featured}
            className="h-4 w-4"
          />
          Основные
        </label>
        {fresh ? null : (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="defDelete" value={String(id)} className="h-4 w-4" />
            Удалить
          </label>
        )}
      </div>
    </div>
  );
}
