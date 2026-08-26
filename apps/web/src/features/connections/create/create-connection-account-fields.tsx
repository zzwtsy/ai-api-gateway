import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type { ConnectionFormValue } from "./create-connection-form-types";
import { useFieldArray } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { arrayPath, fieldPath } from "./create-connection-form-types";

export function AccountFields({
  accountIndex,
  canRemove,
  control,
  errors,
  onCredentialAdded,
  onCredentialRemoved,
  onRemove,
  register,
}: {
  readonly accountIndex: number;
  readonly canRemove: boolean;
  readonly control: Control<ConnectionFormValue>;
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly onCredentialAdded: () => string;
  readonly onCredentialRemoved: (ref: string) => void;
  readonly onRemove: () => void;
  readonly register: UseFormRegister<ConnectionFormValue>;
}) {
  const credentials = useFieldArray({
    control,
    name: arrayPath(`accounts.${accountIndex}.credentials`),
  });

  const addCredential = () => {
    const ref = onCredentialAdded();
    credentials.append({ ref, name: `Key ${credentials.fields.length + 1}`, secret: "" });
  };

  return (
    <section className="rounded-lg border p-4" aria-labelledby={`connection-account-title-${accountIndex}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id={`connection-account-title-${accountIndex}`} className="text-sm font-medium">
          {`账号 ${accountIndex + 1}`}
        </h3>
        <Button type="button" variant="ghost" size="sm" disabled={!canRemove} onClick={onRemove}>
          删除账号
        </Button>
      </div>
      <input type="hidden" {...register(fieldPath(`accounts.${accountIndex}.ref`))} />
      <Field data-invalid={errors.accounts?.[accountIndex]?.name !== undefined || undefined}>
        <FieldLabel htmlFor={`connection-account-${accountIndex}`}>账号名称</FieldLabel>
        <Input
          id={`connection-account-${accountIndex}`}
          aria-invalid={errors.accounts?.[accountIndex]?.name !== undefined}
          {...register(fieldPath(`accounts.${accountIndex}.name`))}
        />
        <FieldError errors={[errors.accounts?.[accountIndex]?.name]} />
      </Field>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm font-medium">访问 Key</p>
          <p className="text-sm text-muted-foreground">每个 Key 可绑定到一个或多个 Endpoint。</p>
        </div>
        <div className="space-y-2">
          {credentials.fields.map((credential, credentialIndex) => (
            <CredentialFields
              key={credential.id}
              accountIndex={accountIndex}
              canRemove={credentials.fields.length > 1}
              credentialIndex={credentialIndex}
              errors={errors}
              onRemove={() => {
                onCredentialRemoved(credential.ref);
                credentials.remove(credentialIndex);
              }}
              register={register}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCredential}>
          添加 Key
        </Button>
      </div>
    </section>
  );
}

function CredentialFields({
  accountIndex,
  canRemove,
  credentialIndex,
  errors,
  onRemove,
  register,
}: {
  readonly accountIndex: number;
  readonly canRemove: boolean;
  readonly credentialIndex: number;
  readonly errors: FieldErrors<ConnectionFormValue>;
  readonly onRemove: () => void;
  readonly register: UseFormRegister<ConnectionFormValue>;
}) {
  const credentialErrors = errors.accounts?.[accountIndex]?.credentials?.[credentialIndex];
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
      <input type="hidden" {...register(fieldPath(`accounts.${accountIndex}.credentials.${credentialIndex}.ref`))} />
      <Field data-invalid={credentialErrors?.name !== undefined || undefined}>
        <FieldLabel htmlFor={`connection-credential-name-${accountIndex}-${credentialIndex}`}>
          凭据名称
        </FieldLabel>
        <Input
          id={`connection-credential-name-${accountIndex}-${credentialIndex}`}
          aria-invalid={credentialErrors?.name !== undefined}
          {...register(fieldPath(`accounts.${accountIndex}.credentials.${credentialIndex}.name`))}
        />
        <FieldError errors={[credentialErrors?.name]} />
      </Field>
      <Field data-invalid={credentialErrors?.secret !== undefined || undefined}>
        <FieldLabel htmlFor={`connection-credential-secret-${accountIndex}-${credentialIndex}`}>
          {credentialIndex === 0 ? "Provider API Key" : `Provider API Key ${credentialIndex + 1}`}
        </FieldLabel>
        <Input
          id={`connection-credential-secret-${accountIndex}-${credentialIndex}`}
          type="password"
          autoComplete="off"
          aria-invalid={credentialErrors?.secret !== undefined}
          placeholder="sk-..."
          {...register(fieldPath(`accounts.${accountIndex}.credentials.${credentialIndex}.secret`))}
        />
        <FieldError errors={[credentialErrors?.secret]} />
      </Field>
      <FieldError className="sm:col-span-2" errors={[credentialErrors?.ref]} />
      <Button type="button" variant="ghost" size="sm" disabled={!canRemove} onClick={onRemove}>
        删除凭据
      </Button>
    </div>
  );
}
