import divisions from './vn-divisions.json';

export type VietnamWard = [string, string, string, string];
export type VietnamDistrict = [string, string, string, string, VietnamWard[]];
export type VietnamProvince = [string, string, string, string, VietnamDistrict[]];

const provinces = divisions as VietnamProvince[];

export interface ProvinceOption {
  code: string;
  name: string;
}

export interface DistrictOption {
  code: string;
  name: string;
}

export interface WardOption {
  code: string;
  name: string;
  district: DistrictOption;
}

export interface AddressSelection {
  province?: ProvinceOption;
  district?: DistrictOption;
  ward?: WardOption;
}

export const getProvinces = (): ProvinceOption[] => {
  const priorityOrder = ['37', '01']; // Ninh Bình, Hà Nội

  return provinces
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.code);
      const bPriority = priorityOrder.indexOf(b.code);
      const aRank = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
      const bRank = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return a.name.localeCompare(b.name);
    });
};

export const getDistricts = (provinceCode: string): DistrictOption[] => {
  const province = provinces.find(([code]) => code === provinceCode);
  if (!province) return [];

  const districts = province[4].map((district) => ({
    code: district[0],
    name: district[1],
  }));

  if (provinceCode === '37') {
    const priority = ['372']; // Nho Quan district code
    return districts.sort((a, b) => {
      const aPriority = priority.indexOf(a.code);
      const bPriority = priority.indexOf(b.code);
      const aRank = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
      const bRank = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
  }

  return districts.sort((a, b) => a.name.localeCompare(b.name));
};

export const getWards = (provinceCode: string): WardOption[] => {
  const province = provinces.find(([code]) => code === provinceCode);
  if (!province) return [];

  return province[4]
    .flatMap((district) => {
      const districtOption: DistrictOption = {
        code: district[0],
        name: district[1],
      };

      return district[4].map((ward) => ({
        code: ward[0],
        name: ward[1],
        district: districtOption,
      }));
    })
    .sort((a, b) => {
      if (provinceCode === '37') {
        const priority = ['372']; // Nho Quan district code
        const aPriority = priority.indexOf(a.district.code);
        const bPriority = priority.indexOf(b.district.code);
        const aRank = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
        const bRank = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;

        if (aRank !== bRank) {
          return aRank - bRank;
        }
      }

      const districtCompare = a.district.name.localeCompare(b.district.name);
      if (districtCompare !== 0) return districtCompare;
      return a.name.localeCompare(b.name);
    });
};

export const formatFullAddress = (selection: AddressSelection): string | undefined => {
  const parts = [selection.ward?.name, selection.district?.name, selection.province?.name].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(', ');
};
