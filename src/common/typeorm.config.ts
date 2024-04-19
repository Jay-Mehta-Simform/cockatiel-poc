import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const TypeormConfigOptions: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: 'db.sqlite',
  entities: ['dist/entities/**/*.entity.js'],
  synchronize: true,
};
