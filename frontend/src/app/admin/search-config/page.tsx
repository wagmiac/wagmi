import AdminSearchConfigClient from './AdminSearchConfigClient';

export const metadata = {
  title: '搜索配置管理 | WAGMI Admin',
  description: '管理内容引擎的自动搜索配置',
};

export default function AdminSearchConfigPage() {
  return <AdminSearchConfigClient />;
}
