-- Allow email-style usernames and seed default admin

alter table public."AMVS_Users"
  drop constraint if exists "AMVS_Users_Username_format_chk";

alter table public."AMVS_Users"
  add constraint "AMVS_Users_Username_format_chk"
  check ("Username" ~ '^[a-zA-Z0-9._@+-]{3,64}$');

insert into public."AMVS_Users" (
  "Username",
  "PasswordHash",
  "Email",
  "DisplayName",
  "IsActive"
)
values (
  'jatin.saksena1987@gmail.com',
  '$2b$12$v..bYBo2t7nXTkjxgoHDW.gRWoMW3Z/8cAza22KGij/2Aim1DVFwa',
  'jatin.saksena1987@gmail.com',
  'Jatin Saksena',
  true
)
on conflict ("Username") do update
set
  "PasswordHash" = excluded."PasswordHash",
  "Email" = excluded."Email",
  "DisplayName" = excluded."DisplayName",
  "IsActive" = true,
  "UpdatedAt" = now();

insert into public."AMVS_UserRoles" ("UserId", "Role")
select u."Id", 'admin'
from public."AMVS_Users" u
where u."Username" = 'jatin.saksena1987@gmail.com'
on conflict ("UserId", "Role") do nothing;

insert into public."AMVS_UserRoles" ("UserId", "Role")
select u."Id", 'user'
from public."AMVS_Users" u
where u."Username" = 'jatin.saksena1987@gmail.com'
on conflict ("UserId", "Role") do nothing;
